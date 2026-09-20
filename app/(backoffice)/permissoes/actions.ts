"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PERFIS_GRADE_PERMISSOES } from "@/lib/acesso";
import { registrarAuditoria } from "@/lib/auditoria";
import { exigirSuperAdmin } from "@/lib/sessao";

export type PermissaoFormState = {
  error?: string;
};

export async function salvarPermissaoPerfil(
  moduloId: number,
  perfil: string,
  podeAcessar: boolean,
): Promise<PermissaoFormState> {
  const logado = await exigirSuperAdmin();

  if (
    !(PERFIS_GRADE_PERMISSOES as readonly string[]).includes(perfil)
  ) {
    return { error: "Perfil inválido." };
  }

  const modulo = await prisma.modulo.findUnique({
    where: { id: moduloId },
    select: { id: true, somente_super_admin: true },
  });
  if (!modulo || modulo.somente_super_admin) {
    return { error: "Módulo inválido." };
  }

  const anterior = await prisma.permissao_perfil.findUnique({
    where: { perfil_modulo_id: { perfil, modulo_id: moduloId } },
    select: { pode_acessar: true },
  });

  await prisma.permissao_perfil.upsert({
    where: {
      perfil_modulo_id: { perfil, modulo_id: moduloId },
    },
    update: { pode_acessar: podeAcessar },
    create: { perfil, modulo_id: moduloId, pode_acessar: podeAcessar },
  });

  if (anterior?.pode_acessar !== podeAcessar) {
    await registrarAuditoria({
      usuarioId: logado.id,
      acao: "permissao_perfil.alterar",
      entidadeTipo: "permissao_perfil",
      entidadeId: moduloId,
      valorAnterior: {
        perfil,
        modulo_id: moduloId,
        pode_acessar: anterior?.pode_acessar ?? null,
      },
      valorNovo: { perfil, modulo_id: moduloId, pode_acessar: podeAcessar },
    });
  }

  revalidatePath("/permissoes");
  revalidatePath("/", "layout");
  return {};
}
