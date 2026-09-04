"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/lib/sessao";
import {
  soDigitos,
  validarCnpjCpf,
  validarEmail,
} from "@/lib/documento";

export type FornecedorFormState = {
  error?: string;
};

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

function lerDadosFornecedor(formData: FormData) {
  const razao_social = texto(formData, "razao_social");
  const nome_fantasia = texto(formData, "nome_fantasia");
  const documentoBruto = texto(formData, "cnpj_cpf");
  const inscricao_estadual = texto(formData, "inscricao_estadual");
  const telefoneBruto = texto(formData, "telefone");
  const email = texto(formData, "email");
  const endereco = texto(formData, "endereco");
  const contato_nome = texto(formData, "contato_nome");
  const ativo = formData.get("ativo") === "on";

  if (!razao_social) {
    return { error: "Informe a razão social." } as const;
  }
  if (razao_social.length > 150) {
    return { error: "A razão social deve ter no máximo 150 caracteres." } as const;
  }
  if (nome_fantasia.length > 150) {
    return { error: "O nome fantasia deve ter no máximo 150 caracteres." } as const;
  }

  const documento = soDigitos(documentoBruto);
  if (!documento) {
    return { error: "Informe o CPF ou CNPJ." } as const;
  }
  if (!validarCnpjCpf(documento)) {
    return {
      error:
        "CPF/CNPJ inválido. Informe um documento com dígitos verificadores válidos.",
    } as const;
  }

  let telefone: string | null = null;
  if (telefoneBruto) {
    const digitos = soDigitos(telefoneBruto);
    if (digitos.length < 10 || digitos.length > 11) {
      return { error: "Telefone inválido. Use DDD + número." } as const;
    }
    telefone = digitos;
  }

  if (email && !validarEmail(email)) {
    return { error: "E-mail inválido." } as const;
  }
  if (email.length > 150) {
    return { error: "O e-mail deve ter no máximo 150 caracteres." } as const;
  }
  if (endereco.length > 255) {
    return { error: "O endereço deve ter no máximo 255 caracteres." } as const;
  }
  if (inscricao_estadual.length > 20) {
    return {
      error: "A inscrição estadual deve ter no máximo 20 caracteres.",
    } as const;
  }
  if (contato_nome.length > 100) {
    return { error: "O nome do contato deve ter no máximo 100 caracteres." } as const;
  }

  return {
    data: {
      razao_social,
      nome_fantasia: nome_fantasia || null,
      cnpj_cpf: documento,
      inscricao_estadual: inscricao_estadual || null,
      telefone,
      email: email || null,
      endereco: endereco || null,
      contato_nome: contato_nome || null,
      ativo,
    },
  } as const;
}

function revalidar() {
  revalidatePath("/fornecedores");
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/pagar/nova");
}

export async function criarFornecedor(
  _estado: FornecedorFormState,
  formData: FormData,
): Promise<FornecedorFormState> {
  await exigirModulo("fornecedores");
  const resultado = lerDadosFornecedor(formData);
  if ("error" in resultado) return { error: resultado.error };

  try {
    await prisma.fornecedor.create({ data: resultado.data });
  } catch (erro) {
    if (erroUnico(erro)) {
      return { error: "Já existe um fornecedor com este CPF/CNPJ." };
    }
    return { error: "Não foi possível cadastrar o fornecedor." };
  }

  revalidar();
  redirect("/fornecedores");
}

export async function atualizarFornecedor(
  id: number,
  _estado: FornecedorFormState,
  formData: FormData,
): Promise<FornecedorFormState> {
  await exigirModulo("fornecedores");
  if (!Number.isInteger(id)) return { error: "Fornecedor inválido." };
  const resultado = lerDadosFornecedor(formData);
  if ("error" in resultado) return { error: resultado.error };

  try {
    await prisma.fornecedor.update({
      where: { id },
      data: resultado.data,
    });
  } catch (erro) {
    if (erroUnico(erro)) {
      return { error: "Já existe um fornecedor com este CPF/CNPJ." };
    }
    return { error: "Não foi possível atualizar o fornecedor." };
  }

  revalidar();
  redirect("/fornecedores");
}

export async function inativarFornecedor(id: number) {
  await exigirModulo("fornecedores");
  await prisma.fornecedor.update({
    where: { id },
    data: { ativo: false },
  });
  revalidar();
}
