"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
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
  });
  if (!usuario || !usuario.ativo) return { error: "Usuário não encontrado." };
  if (!usuario.senha_provisoria) {
    return { error: "Esta conta já está com senha definitiva." };
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      senha_hash: await bcrypt.hash(senha, 10),
      senha_provisoria: false,
    },
  });

  try {
    await signIn("credentials", {
      email: usuario.email,
      password: senha,
      redirectTo: "/",
    });
  } catch (erro) {
    if (erro instanceof AuthError) {
      return { error: "Senha alterada. Entre novamente." };
    }
    throw erro;
  }

  return {};
}
