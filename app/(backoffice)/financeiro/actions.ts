"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/lib/sessao";
import { arredondarDinheiro } from "@/lib/dinheiro";
import {
  dataUtcMeiaNoite,
  ehIsoData,
  ocorrenciasMensais,
} from "@/lib/financeiro";
import { categoriaPagarValida } from "./categoria-actions";

export type ContaFormState = {
  error?: string;
};

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function inteiroOpcional(formData: FormData, campo: string) {
  const bruto = texto(formData, campo);
  if (!bruto) return null;
  const valor = Number(bruto);
  return Number.isInteger(valor) ? valor : NaN;
}

function dinheiro(formData: FormData, campo: string) {
  const bruto = texto(formData, campo).replace(",", ".");
  if (!bruto) return null;
  const valor = Number(bruto);
  return Number.isFinite(valor) ? arredondarDinheiro(valor) : NaN;
}

function dataIso(formData: FormData, campo: string) {
  const bruto = texto(formData, campo);
  if (!bruto || !ehIsoData(bruto)) return null;
  return dataUtcMeiaNoite(bruto);
}

function revalidarFinanceiro() {
  revalidatePath("/financeiro");
  revalidatePath("/");
}

export async function criarContaPagar(
  _estado: ContaFormState,
  formData: FormData,
): Promise<ContaFormState> {
  await exigirModulo("financeiro");
  const descricao = texto(formData, "descricao");
  const valor = dinheiro(formData, "valor");
  const vencimento = dataIso(formData, "data_vencimento");
  const categoriaId = inteiroOpcional(formData, "categoria_id");
  const fornecedorId = inteiroOpcional(formData, "fornecedor_id");
  const recorrente = formData.get("recorrente") === "on";

  if (!descricao) return { error: "Informe a descrição." };
  if (descricao.length > 200) {
    return { error: "A descrição deve ter no máximo 200 caracteres." };
  }
  if (valor == null || Number.isNaN(valor) || valor <= 0) {
    return { error: "Informe um valor maior que zero." };
  }
  if (!vencimento) return { error: "Informe a data de vencimento." };
  if (categoriaId == null || Number.isNaN(categoriaId)) {
    return { error: "Selecione a categoria financeira." };
  }
  if (fornecedorId != null && Number.isNaN(fornecedorId)) {
    return { error: "Fornecedor inválido." };
  }

  if (!(await categoriaPagarValida(categoriaId))) {
    return { error: "Selecione uma categoria de custo fixo ou variável." };
  }

  if (fornecedorId != null) {
    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id: fornecedorId },
      select: { id: true },
    });
    if (!fornecedor) return { error: "Fornecedor não encontrado." };
  }

  const datas = recorrente
    ? ocorrenciasMensais(vencimento, 12)
    : [vencimento];

  await prisma.conta_pagar.createMany({
    data: datas.map((data_vencimento) => ({
      fornecedor_id: fornecedorId,
      categoria_id: categoriaId,
      descricao,
      valor,
      data_vencimento,
      status: "aberta",
      recorrente,
    })),
  });

  revalidarFinanceiro();
  redirect("/financeiro?aba=despesas&status=aberta");
}

export async function criarContaReceber(
  _estado: ContaFormState,
  formData: FormData,
): Promise<ContaFormState> {
  await exigirModulo("financeiro");
  const descricao = texto(formData, "descricao");
  const valor = dinheiro(formData, "valor");
  const vencimento = dataIso(formData, "data_vencimento");
  const clienteId = inteiroOpcional(formData, "cliente_id");

  if (!descricao) return { error: "Informe a descrição." };
  if (descricao.length > 200) {
    return { error: "A descrição deve ter no máximo 200 caracteres." };
  }
  if (valor == null || Number.isNaN(valor) || valor <= 0) {
    return { error: "Informe um valor maior que zero." };
  }
  if (!vencimento) return { error: "Informe a data de vencimento." };
  if (clienteId != null && Number.isNaN(clienteId)) {
    return { error: "Cliente inválido." };
  }

  if (clienteId != null) {
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true },
    });
    if (!cliente) return { error: "Cliente não encontrado." };
  }

  await prisma.conta_receber.create({
    data: {
      cliente_id: clienteId,
      descricao,
      valor,
      data_vencimento: vencimento,
      status: "aberta",
    },
  });

  revalidarFinanceiro();
  redirect("/financeiro?aba=receber&status=aberta");
}

export async function marcarContaPaga(
  id: number,
  _estado: ContaFormState,
  formData: FormData,
): Promise<ContaFormState> {
  await exigirModulo("financeiro");
  if (!Number.isInteger(id)) return { error: "Conta inválida." };

  const pagamento = dataIso(formData, "data_pagamento");
  if (!pagamento) return { error: "Informe a data de pagamento." };

  const conta = await prisma.conta_pagar.findUnique({ where: { id } });
  if (!conta) return { error: "Conta não encontrada." };
  if (conta.status === "paga") return { error: "Esta conta já está paga." };
  if (conta.status === "cancelada") {
    return { error: "Não é possível pagar uma conta cancelada." };
  }

  await prisma.conta_pagar.update({
    where: { id },
    data: {
      data_pagamento: pagamento,
      status: "paga",
    },
  });

  revalidarFinanceiro();
  redirect("/financeiro?aba=despesas&status=aberta");
}

export async function marcarContaRecebida(
  id: number,
  _estado: ContaFormState,
  formData: FormData,
): Promise<ContaFormState> {
  await exigirModulo("financeiro");
  if (!Number.isInteger(id)) return { error: "Conta inválida." };

  const recebimento = dataIso(formData, "data_recebimento");
  if (!recebimento) return { error: "Informe a data de recebimento." };

  const conta = await prisma.conta_receber.findUnique({ where: { id } });
  if (!conta) return { error: "Conta não encontrada." };
  if (conta.status === "recebida") {
    return { error: "Esta conta já está recebida." };
  }
  if (conta.status === "cancelada") {
    return { error: "Não é possível receber uma conta cancelada." };
  }

  await prisma.conta_receber.update({
    where: { id },
    data: {
      data_recebimento: recebimento,
      status: "recebida",
    },
  });

  revalidarFinanceiro();
  redirect("/financeiro?aba=receber&status=aberta");
}
