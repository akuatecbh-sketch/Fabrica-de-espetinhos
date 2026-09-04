"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/lib/sessao";
import {
  soDigitos,
  validarCpf,
  validarEmail,
} from "@/lib/documento";
import { dataUtcMeiaNoite, ehIsoData } from "@/lib/financeiro";

export type ClienteFormState = {
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

function lerDadosCliente(formData: FormData) {
  const nome = texto(formData, "nome");
  const cpfBruto = texto(formData, "cpf");
  const telefoneBruto = texto(formData, "telefone");
  const email = texto(formData, "email");
  const endereco = texto(formData, "endereco");
  const nascimentoBruto = texto(formData, "data_nascimento");

  if (!nome) return { error: "Informe o nome do cliente." } as const;
  if (nome.length > 150) {
    return { error: "O nome deve ter no máximo 150 caracteres." } as const;
  }

  let cpf: string | null = null;
  if (cpfBruto) {
    const digitos = soDigitos(cpfBruto);
    if (!validarCpf(digitos)) {
      return { error: "CPF inválido. Verifique os dígitos e tente novamente." } as const;
    }
    cpf = digitos;
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

  let data_nascimento: Date | null = null;
  if (nascimentoBruto) {
    if (!ehIsoData(nascimentoBruto)) {
      return { error: "Data de nascimento inválida." } as const;
    }
    data_nascimento = dataUtcMeiaNoite(nascimentoBruto);
  }

  return {
    data: {
      nome,
      cpf,
      telefone,
      email: email || null,
      endereco: endereco || null,
      data_nascimento,
    },
  } as const;
}

function revalidar() {
  revalidatePath("/clientes");
}

export async function criarCliente(
  _estado: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  await exigirModulo("clientes");
  const resultado = lerDadosCliente(formData);
  if ("error" in resultado) return { error: resultado.error };

  try {
    await prisma.cliente.create({ data: resultado.data });
  } catch (erro) {
    if (erroUnico(erro)) {
      return { error: "Já existe um cliente com este CPF." };
    }
    return { error: "Não foi possível cadastrar o cliente." };
  }

  revalidar();
  redirect("/clientes");
}

export async function atualizarCliente(
  id: number,
  _estado: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  await exigirModulo("clientes");
  if (!Number.isInteger(id)) return { error: "Cliente inválido." };
  const resultado = lerDadosCliente(formData);
  if ("error" in resultado) return { error: resultado.error };

  try {
    await prisma.cliente.update({
      where: { id },
      data: resultado.data,
    });
  } catch (erro) {
    if (erroUnico(erro)) {
      return { error: "Já existe um cliente com este CPF." };
    }
    return { error: "Não foi possível atualizar o cliente." };
  }

  revalidar();
  redirect("/clientes");
}

export async function excluirCliente(
  id: number,
): Promise<{ error?: string }> {
  await exigirModulo("clientes");
  if (!Number.isInteger(id)) return { error: "Cliente inválido." };

  const existente = await prisma.cliente.findUnique({ where: { id } });
  if (!existente) return { error: "Cliente não encontrado." };

  const vendas = await prisma.venda.count({ where: { cliente_id: id } });
  if (vendas > 0) {
    return {
      error: `Não é possível excluir: ${vendas} venda(s) estão associadas a este cliente.`,
    };
  }

  const contas = await prisma.conta_receber.count({
    where: { cliente_id: id },
  });
  if (contas > 0) {
    return {
      error: `Não é possível excluir: ${contas} conta(s) a receber estão associadas a este cliente.`,
    };
  }

  await prisma.cliente.delete({ where: { id } });
  revalidar();
  return {};
}
