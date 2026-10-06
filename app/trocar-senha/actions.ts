"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/auth";
import { validarNovaSenha } from "@/lib/senha";
import { obterUsuarioSessao } from "@/lib/sessao";

export type TrocarSenhaState = {
  error?: string;
};

export async function trocarSenhaProvisoria(
  _estado: TrocarSenhaState,
  formData: FormData,
): Promise<TrocarSenhaState> {
  const sessao = await obterUsuarioSessao();
  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  const senhaErro = validarNovaSenha(senha, confirmacao);
  if (senhaErro) return { error: senhaErro };

  const usuario = await prisma.usuario.findUnique({
    where: { id: sessao.id },
    select: { id: true, ativo: true, senha_provisoria: true },
  });
  if (!usuario || !usuario.ativo || !usuario.senha_provisoria) {
    await signOut({ redirectTo: "/login" });
    return {};
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      senha_hash: await bcrypt.hash(senha, 10),
      senha_provisoria: false,
    },
  });

  await signOut({ redirectTo: "/login?senha=alterada" });
  return {};
}

export async function sairDaTrocaDeSenha() {
  await signOut({ redirectTo: "/login" });
}
