"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validarEmail } from "@/lib/documento";
import {
  podeAtribuirPerfil,
  podeGerenciarUsuario,
} from "@/lib/acesso";
import { validarNovaSenha } from "@/lib/senha";
import { exigirModuloUsuarios } from "@/lib/sessao";
import { superAdminOcultoPara } from "@/lib/visibilidade";

export type UsuarioFormState = {
  error?: string;
};

const ACESSO_NEGADO = "Acesso não permitido";

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function erroUnico(erro: unknown) {
  return (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro &&
    erro.code === "P2002"
  );
}

export async function criarUsuario(
  _estado: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const logado = await exigirModuloUsuarios();
  const nome = texto(formData, "nome");
  const email = texto(formData, "email").toLowerCase();
  const perfil = texto(formData, "perfil");
  const senha = String(formData.get("senha") ?? "");

  if (!nome) return { error: "Informe o nome." };
  if (nome.length > 150) return { error: "Nome muito longo." };
  if (!validarEmail(email)) return { error: "E-mail inválido." };
  if (!podeAtribuirPerfil(logado.perfil, perfil)) {
    return { error: ACESSO_NEGADO };
  }
  const senhaErro = validarNovaSenha(senha);
  if (senhaErro) return { error: senhaErro };

  try {
    await prisma.usuario.create({
      data: {
        nome,
        email,
        perfil,
        senha_hash: await bcrypt.hash(senha, 10),
        senha_provisoria: true,
        ativo: true,
        criado_por_id: logado.id,
      },
    });
  } catch (erro) {
    if (erroUnico(erro)) return { error: "Já existe um usuário com este e-mail." };
    throw erro;
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function atualizarUsuario(
  id: number,
  _estado: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const logado = await exigirModuloUsuarios();
  if (!Number.isInteger(id)) return { error: "Usuário inválido." };

  const alvo = await prisma.usuario.findUnique({ where: { id } });
  if (!alvo) return { error: "Usuário não encontrado." };
  if (superAdminOcultoPara(logado.perfil, alvo.perfil)) {
    return { error: "Usuário não encontrado." };
  }
  if (!podeGerenciarUsuario(logado.perfil, alvo.perfil)) {
    return { error: ACESSO_NEGADO };
  }

  const nome = texto(formData, "nome");
  const email = texto(formData, "email").toLowerCase();
  const perfil = texto(formData, "perfil");

  if (!nome) return { error: "Informe o nome." };
  if (nome.length > 150) return { error: "Nome muito longo." };
  if (!validarEmail(email)) return { error: "E-mail inválido." };
  if (perfil !== alvo.perfil) {
    if (
      !podeAtribuirPerfil(logado.perfil, perfil) ||
      !podeGerenciarUsuario(logado.perfil, perfil)
    ) {
      return { error: ACESSO_NEGADO };
    }
  }

  try {
    await prisma.usuario.update({
      where: { id },
      data: { nome, email, perfil },
    });
  } catch (erro) {
    if (erroUnico(erro)) return { error: "Já existe um usuário com este e-mail." };
    throw erro;
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function inativarUsuario(id: number): Promise<{ error?: string }> {
  const logado = await exigirModuloUsuarios();
  if (!Number.isInteger(id)) return { error: "Usuário inválido." };
  if (id === logado.id) {
    return { error: "Você não pode inativar o próprio usuário." };
  }

  const alvo = await prisma.usuario.findUnique({ where: { id } });
  if (!alvo) return { error: "Usuário não encontrado." };
  if (superAdminOcultoPara(logado.perfil, alvo.perfil)) {
    return { error: "Usuário não encontrado." };
  }
  if (!podeGerenciarUsuario(logado.perfil, alvo.perfil)) {
    return { error: ACESSO_NEGADO };
  }

  await prisma.usuario.update({
    where: { id },
    data: { ativo: false },
  });
  revalidatePath("/usuarios");
  return {};
}

export async function redefinirSenhaUsuario(
  id: number,
  _estado: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const logado = await exigirModuloUsuarios();
  if (!Number.isInteger(id)) return { error: "Usuário inválido." };

  const alvo = await prisma.usuario.findUnique({ where: { id } });
  if (!alvo) return { error: "Usuário não encontrado." };
  if (superAdminOcultoPara(logado.perfil, alvo.perfil)) {
    return { error: "Usuário não encontrado." };
  }
  if (!podeGerenciarUsuario(logado.perfil, alvo.perfil)) {
    return { error: ACESSO_NEGADO };
  }

  const senha = String(formData.get("senha") ?? "");
  const senhaErro = validarNovaSenha(senha);
  if (senhaErro) return { error: senhaErro };

  await prisma.usuario.update({
    where: { id },
    data: {
      senha_hash: await bcrypt.hash(senha, 10),
      senha_provisoria: true,
    },
  });
  revalidatePath("/usuarios");
  return {};
}
