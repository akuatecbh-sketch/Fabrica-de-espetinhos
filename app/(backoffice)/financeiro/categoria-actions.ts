"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/lib/sessao";
import {
  ehTipoCategoriaFinanceira,
  ehTipoCategoriaPagar,
} from "@/lib/financeiro";

export type CategoriaFinanceiraOpcao = {
  id: number;
  nome: string;
  tipo: string;
};

export type CategoriaFinanceiraComUso = CategoriaFinanceiraOpcao & {
  contas: number;
};

function revalidar() {
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/pagar/nova");
  revalidatePath("/");
}

export async function criarCategoriaFinanceira(
  nomeBruto: string,
  tipoBruto: string,
): Promise<{ error?: string; categoria?: CategoriaFinanceiraOpcao }> {
  await exigirModulo("financeiro");
  const nome = nomeBruto.trim();
  const tipo = tipoBruto.trim();

  if (!nome) return { error: "Informe o nome da categoria." };
  if (nome.length > 80) {
    return { error: "O nome da categoria deve ter no máximo 80 caracteres." };
  }
  if (!ehTipoCategoriaFinanceira(tipo)) {
    return { error: "Selecione um tipo válido." };
  }

  const categoria = await prisma.categoria_financeira.create({
    data: { nome, tipo },
    select: { id: true, nome: true, tipo: true },
  });

  revalidar();
  return { categoria };
}

export async function listarCategoriasFinanceirasComUso(): Promise<
  CategoriaFinanceiraComUso[]
> {
  await exigirModulo("financeiro");
  const categorias = await prisma.categoria_financeira.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { conta_pagar: true } } },
  });
  return categorias.map((categoria) => ({
    id: categoria.id,
    nome: categoria.nome,
    tipo: categoria.tipo,
    contas: categoria._count.conta_pagar,
  }));
}

export async function excluirCategoriaFinanceira(
  id: number,
): Promise<{ error?: string }> {
  await exigirModulo("financeiro");
  if (!Number.isInteger(id)) return { error: "Categoria inválida." };

  const quantidade = await prisma.conta_pagar.count({
    where: { categoria_id: id },
  });
  if (quantidade > 0) {
    return {
      error: `Não é possível excluir: ${quantidade} conta(s) a pagar usam esta categoria. Troque a categoria dessas contas antes.`,
    };
  }

  const existente = await prisma.categoria_financeira.findUnique({
    where: { id },
  });
  if (!existente) return { error: "Categoria não encontrada." };

  await prisma.categoria_financeira.delete({ where: { id } });
  revalidar();
  return {};
}

export async function categoriaPagarValida(id: number) {
  await exigirModulo("financeiro");
  const categoria = await prisma.categoria_financeira.findUnique({
    where: { id },
    select: { id: true, tipo: true },
  });
  if (!categoria) return false;
  return ehTipoCategoriaPagar(categoria.tipo);
}
