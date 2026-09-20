"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { arredondarQuantidade } from "@/lib/dinheiro";
import { TIPO_SERVICO } from "@/lib/frete";
import { exigirAcesso } from "@/lib/permissoes";

export type InventarioFormState = {
  error?: string;
};

function revalidarInventario(id?: number) {
  revalidatePath("/relatorios/inventario");
  if (id) revalidatePath(`/relatorios/inventario/${id}`);
  revalidatePath("/estoque", "layout");
  revalidatePath("/produtos", "layout");
}

export async function criarContagem(
  _estado: InventarioFormState,
  formData: FormData,
): Promise<InventarioFormState> {
  const usuario = await exigirAcesso("relatorios");
  const descricao = String(formData.get("descricao") ?? "").trim();
  if (!descricao) return { error: "Informe a descrição da contagem." };
  if (descricao.length > 200) {
    return { error: "A descrição deve ter no máximo 200 caracteres." };
  }

  const produtos = await prisma.produto.findMany({
    where: {
      ativo: true,
      controla_estoque: true,
      tipo: { not: TIPO_SERVICO },
    },
    select: { id: true, estoque_atual: true },
    orderBy: { nome: "asc" },
  });
  if (produtos.length === 0) {
    return {
      error:
        "Não há produtos ativos com controle de estoque para incluir na contagem.",
    };
  }

  const contagem = await prisma.inventario_contagem.create({
    data: {
      descricao,
      status: "em_andamento",
      usuario_id: usuario.id,
      inventario_item: {
        create: produtos.map((produto) => ({
          produto_id: produto.id,
          estoque_sistema: produto.estoque_atual,
          quantidade_contada: null,
          diferenca: null,
          ajuste_aplicado: false,
        })),
      },
    },
    select: { id: true },
  });

  revalidarInventario(contagem.id);
  redirect(`/relatorios/inventario/${contagem.id}`);
}

export async function salvarItemContagem(
  itemId: number,
  valorBruto: string,
): Promise<InventarioFormState & { diferenca?: number | null }> {
  await exigirAcesso("relatorios");
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return { error: "Item inválido." };
  }

  const item = await prisma.inventario_item.findUnique({
    where: { id: itemId },
    include: { inventario: { select: { id: true, status: true } } },
  });
  if (!item) return { error: "Item não encontrado." };
  if (item.inventario.status !== "em_andamento") {
    return { error: "Esta contagem já foi finalizada." };
  }

  const texto = valorBruto.trim().replace(",", ".");
  let quantidade_contada: number | null = null;
  let diferenca: number | null = null;
  if (texto) {
    const numero = Number(texto);
    if (!Number.isFinite(numero) || numero < 0) {
      return { error: "Informe uma quantidade válida (zero ou mais)." };
    }
    quantidade_contada = arredondarQuantidade(numero);
    diferenca = arredondarQuantidade(
      quantidade_contada - Number(item.estoque_sistema),
    );
  }

  await prisma.inventario_item.update({
    where: { id: item.id },
    data: { quantidade_contada, diferenca },
  });
  revalidarInventario(item.inventario.id);
  return { diferenca };
}

export async function finalizarContagem(
  inventarioId: number,
): Promise<InventarioFormState> {
  await exigirAcesso("relatorios");
  if (!Number.isInteger(inventarioId) || inventarioId <= 0) {
    return { error: "Contagem inválida." };
  }

  const contagem = await prisma.inventario_contagem.findUnique({
    where: { id: inventarioId },
    select: { id: true, status: true },
  });
  if (!contagem) return { error: "Contagem não encontrada." };
  if (contagem.status !== "em_andamento") {
    return { error: "Esta contagem já foi finalizada." };
  }

  await prisma.inventario_contagem.update({
    where: { id: contagem.id },
    data: { status: "finalizado", finalizado_em: new Date() },
  });
  revalidarInventario(contagem.id);
  return {};
}

async function aplicarAjusteItem(
  tx: Prisma.TransactionClient,
  itemId: number,
  usuarioId: number,
) {
  const item = await tx.inventario_item.findUnique({
    where: { id: itemId },
    include: {
      inventario: { select: { id: true, status: true, descricao: true } },
      produto: { select: { id: true, estoque_atual: true, nome: true } },
    },
  });
  if (!item) throw new Error("ITEM_INEXISTENTE");
  if (item.inventario.status !== "finalizado") {
    throw new Error("NAO_FINALIZADO");
  }
  if (item.ajuste_aplicado) return { aplicado: false as const };
  if (item.quantidade_contada == null || item.diferenca == null) {
    throw new Error("SEM_CONTAGEM");
  }
  const diferenca = arredondarQuantidade(Number(item.diferenca));
  if (diferenca === 0) return { aplicado: false as const };

  const quantidadeContada = arredondarQuantidade(Number(item.quantidade_contada));
  const saldoAnterior = Number(item.produto.estoque_atual);
  const quantidade = arredondarQuantidade(Math.abs(diferenca));
  const tipo = diferenca > 0 ? "ajuste_positivo" : "ajuste_negativo";

  await tx.produto.update({
    where: { id: item.produto.id },
    data: { estoque_atual: quantidadeContada },
  });
  await tx.movimentacao_estoque.create({
    data: {
      produto_id: item.produto.id,
      tipo,
      quantidade,
      saldo_anterior: saldoAnterior,
      saldo_atual: quantidadeContada,
      origem_tipo: "inventario",
      origem_id: item.inventario.id,
      usuario_id: usuarioId,
      observacao: `Inventário: ${item.inventario.descricao}`.slice(0, 200),
    },
  });
  await tx.inventario_item.update({
    where: { id: item.id },
    data: { ajuste_aplicado: true },
  });
  return { aplicado: true as const };
}

export async function aplicarAjusteItemAction(
  itemId: number,
): Promise<InventarioFormState> {
  const usuario = await exigirAcesso("relatorios");
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return { error: "Item inválido." };
  }

  try {
    const inventarioId = await prisma.$transaction(async (tx) => {
      const item = await tx.inventario_item.findUnique({
        where: { id: itemId },
        select: { inventario_id: true },
      });
      if (!item) throw new Error("ITEM_INEXISTENTE");
      await aplicarAjusteItem(tx, itemId, usuario.id);
      return item.inventario_id;
    });
    revalidarInventario(inventarioId);
    return {};
  } catch (erro) {
    return { error: mensagemErroAjuste(erro) };
  }
}

export async function aplicarTodosAjustes(
  inventarioId: number,
): Promise<InventarioFormState> {
  const usuario = await exigirAcesso("relatorios");
  if (!Number.isInteger(inventarioId) || inventarioId <= 0) {
    return { error: "Contagem inválida." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const contagem = await tx.inventario_contagem.findUnique({
        where: { id: inventarioId },
        select: { status: true },
      });
      if (!contagem) throw new Error("ITEM_INEXISTENTE");
      if (contagem.status !== "finalizado") throw new Error("NAO_FINALIZADO");

      const itens = await tx.inventario_item.findMany({
        where: {
          inventario_id: inventarioId,
          ajuste_aplicado: false,
          diferenca: { not: 0 },
          quantidade_contada: { not: null },
        },
        select: { id: true },
      });
      for (const item of itens) {
        await aplicarAjusteItem(tx, item.id, usuario.id);
      }
    });
    revalidarInventario(inventarioId);
    return {};
  } catch (erro) {
    return { error: mensagemErroAjuste(erro) };
  }
}

function mensagemErroAjuste(erro: unknown) {
  if (erro instanceof Error && erro.message === "NAO_FINALIZADO") {
    return "Finalize a contagem antes de aplicar ajustes.";
  }
  if (erro instanceof Error && erro.message === "SEM_CONTAGEM") {
    return "Este item ainda não foi contado.";
  }
  if (erro instanceof Error && erro.message === "ITEM_INEXISTENTE") {
    return "Item ou contagem não encontrado.";
  }
  return "Não foi possível aplicar o ajuste.";
}

