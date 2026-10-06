"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { podeSalvarPermissaoPerfil } from "@/lib/acesso";
import { registrarAuditoria } from "@/lib/auditoria";
import { exigirSuperAdminOuProprietario } from "@/lib/sessao";

export type PermissaoFormState = {
  error?: string;
};

export async function salvarPermissaoPerfil(
  moduloId: number,
  perfil: string,
  podeAcessar: boolean,
): Promise<PermissaoFormState> {
  const logado = await exigirSuperAdminOuProprietario();

  const modulo = await prisma.modulo.findUnique({
    where: { id: moduloId },
    select: { id: true, chave: true, somente_super_admin: true },
  });
  if (
    !modulo ||
    !podeSalvarPermissaoPerfil({
      ator: logado.perfil,
      perfilAlvo: perfil,
      somenteSuperAdmin: modulo.somente_super_admin,
    })
  ) {
    return { error: "Acesso não permitido." };
  }

  if (perfil === logado.perfil && modulo.chave === "usuarios" && !podeAcessar) {
    return {
      error: "Você não pode remover o acesso a Usuários do próprio perfil.",
    };
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
