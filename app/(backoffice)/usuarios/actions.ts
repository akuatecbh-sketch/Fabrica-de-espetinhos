"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validarEmail } from "@/lib/documento";
import {
  mudancaPerdeAcessoPermissoes,
  podeAtribuirPerfil,
  podeGerenciarUsuario,
} from "@/lib/acesso";
import { registrarAuditoria } from "@/lib/auditoria";
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
    const criado = await prisma.usuario.create({
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
    await registrarAuditoria({
      usuarioId: logado.id,
      acao: "usuario.criar",
      entidadeTipo: "usuario",
      entidadeId: criado.id,
      valorNovo: { id: criado.id, nome, email, perfil },
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

  if (id === logado.id && perfil !== alvo.perfil) {
    if (mudancaPerdeAcessoPermissoes(alvo.perfil, perfil)) {
      return {
        error: "Você não pode alterar o próprio perfil e perder o acesso a Permissões.",
      };
    }
    const manteriaUsuarios = await acessoUsuariosComPerfil(id, perfil);
    if (!manteriaUsuarios) {
      return {
        error: "Você não pode alterar o próprio perfil e perder o acesso a Usuários.",
      };
    }
  }

  try {
    await prisma.usuario.update({
      where: { id },
      data: { nome, email, perfil },
    });
    if (perfil !== alvo.perfil) {
      await registrarAuditoria({
        usuarioId: logado.id,
        acao: "usuario.alterar_perfil",
        entidadeTipo: "usuario",
        entidadeId: id,
        valorAnterior: { id, perfil: alvo.perfil },
        valorNovo: { id, perfil },
      });
    }
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

async function acessoUsuariosComPerfil(usuarioId: number, perfil: string) {
  const modulo = await prisma.modulo.findUnique({
    where: { chave: "usuarios" },
    select: { id: true, somente_super_admin: true },
  });
  if (!modulo) return false;
  if (modulo.somente_super_admin) return perfil === "super_admin";
  const excecao = await prisma.permissao_usuario.findFirst({
    where: { usuario_id: usuarioId, modulo_id: modulo.id },
    select: { pode_acessar: true },
  });
  if (excecao) return excecao.pode_acessar;
  const doPerfil = await prisma.permissao_perfil.findFirst({
    where: { perfil, modulo_id: modulo.id },
    select: { pode_acessar: true },
  });
  return doPerfil?.pode_acessar ?? false;
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
