"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validarNovaSenha } from "@/lib/senha";
import { obterUsuarioSessao } from "@/lib/sessao";

export type MinhaContaState = {
  error?: string;
  ok?: boolean;
};

export async function alterarMinhaSenha(
  _estado: MinhaContaState,
  formData: FormData,
): Promise<MinhaContaState> {
  const sessao = await obterUsuarioSessao();
  const atual = String(formData.get("senha_atual") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (!atual) return { error: "Informe a senha atual." };
  const senhaErro = validarNovaSenha(senha, confirmacao);
  if (senhaErro) return { error: senhaErro };

  const usuario = await prisma.usuario.findUnique({
    where: { id: sessao.id },
  });
  if (!usuario || !usuario.ativo) return { error: "Usuário não encontrado." };

  const hash = usuario.senha_hash ?? "";
  if (!hash.startsWith("$2") || !(await bcrypt.compare(atual, hash))) {
    return { error: "Senha atual incorreta." };
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      senha_hash: await bcrypt.hash(senha, 10),
      senha_provisoria: false,
    },
  });

  return { ok: true };
}
