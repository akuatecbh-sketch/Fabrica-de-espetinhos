"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { podeConfigurarPermissoesIndividuais } from "@/lib/acesso";
import { obterUsuarioSessao } from "@/lib/sessao";
import { superAdminOcultoPara } from "@/lib/visibilidade";

export type PermissaoUsuarioState = {
  error?: string;
};

export async function salvarPermissaoUsuario(
  usuarioId: number,
  moduloId: number,
  estado: "padrao" | "liberar" | "bloquear",
): Promise<PermissaoUsuarioState> {
  const logado = await obterUsuarioSessao();
  const alvo = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, perfil: true },
  });
  if (!alvo) return { error: "Usuário não encontrado." };
  if (superAdminOcultoPara(logado.perfil, alvo.perfil)) {
    return { error: "Acesso não permitido." };
  }
  if (!podeConfigurarPermissoesIndividuais(logado.perfil, alvo.perfil)) {
    return { error: "Acesso não permitido." };
  }

  const modulo = await prisma.modulo.findUnique({
    where: { id: moduloId },
    select: { id: true, somente_super_admin: true },
  });
  if (!modulo) return { error: "Módulo inválido." };
  if (modulo.somente_super_admin && logado.perfil !== "super_admin") {
    return { error: "Acesso não permitido." };
  }

  if (estado === "padrao") {
    await prisma.permissao_usuario.deleteMany({
      where: { usuario_id: usuarioId, modulo_id: moduloId },
    });
  } else {
    await prisma.permissao_usuario.upsert({
      where: {
        usuario_id_modulo_id: { usuario_id: usuarioId, modulo_id: moduloId },
      },
      update: {
        pode_acessar: estado === "liberar",
        definido_por_id: logado.id,
      },
      create: {
        usuario_id: usuarioId,
        modulo_id: moduloId,
        pode_acessar: estado === "liberar",
        definido_por_id: logado.id,
      },
    });
  }

  revalidatePath(`/usuarios/${usuarioId}/editar`);
  revalidatePath("/", "layout");
  return {};
}
