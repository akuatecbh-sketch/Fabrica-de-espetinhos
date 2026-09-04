"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/lib/sessao";
import { TIPOS_INSUMO } from "@/lib/produto-tipo";

export type FichaFormState = {
  error?: string;
};

function quantidadeDoFormulario(formData: FormData) {
  const bruto = String(formData.get("quantidade") ?? "")
    .trim()
    .replace(",", ".");
  if (!bruto) return NaN;
  const valor = Number(bruto);
  return Number.isFinite(valor) ? valor : NaN;
}

async function garantirProdutoFinal(id: number) {
  const produto = await prisma.produto.findUnique({ where: { id } });
  if (!produto) return { error: "Produto não encontrado." } as const;
  if (produto.tipo !== "produto_final") {
    return {
      error: "A ficha técnica só se aplica a produto final.",
    } as const;
  }
  return { produto } as const;
}

function revalidarEdicao(produtoId: number) {
  revalidatePath(`/produtos/${produtoId}/editar`);
  revalidatePath("/produtos");
}

export async function adicionarInsumoFicha(
  produtoFinalId: number,
  _estado: FichaFormState,
  formData: FormData,
): Promise<FichaFormState> {
  await exigirModulo("produtos");
  const destino = await garantirProdutoFinal(produtoFinalId);
  if ("error" in destino) return { error: destino.error };

  const insumoId = Number(formData.get("insumo_id"));
  const quantidade = quantidadeDoFormulario(formData);

  if (!Number.isInteger(insumoId)) {
    return { error: "Selecione um insumo." };
  }
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return { error: "Informe uma quantidade maior que zero." };
  }

  const insumo = await prisma.produto.findFirst({
    where: {
      id: insumoId,
      ativo: true,
      tipo: { in: [...TIPOS_INSUMO] },
    },
  });
  if (!insumo) {
    return {
      error: "Insumo inválido. Use um insumo ou embalagem ativo.",
    };
  }
  if (insumo.id === produtoFinalId) {
    return { error: "O produto não pode ser insumo de si mesmo." };
  }

  try {
    await prisma.ficha_tecnica.create({
      data: {
        produto_final_id: produtoFinalId,
        insumo_id: insumo.id,
        quantidade,
      },
    });
  } catch (erro) {
    if (
      typeof erro === "object" &&
      erro !== null &&
      "code" in erro &&
      erro.code === "P2002"
    ) {
      return { error: "Este insumo já está na ficha técnica." };
    }
    return { error: "Não foi possível adicionar o insumo." };
  }

  revalidarEdicao(produtoFinalId);
  return {};
}

export async function atualizarQuantidadeFicha(
  fichaId: number,
  produtoFinalId: number,
  _estado: FichaFormState,
  formData: FormData,
): Promise<FichaFormState> {
  await exigirModulo("produtos");
  const destino = await garantirProdutoFinal(produtoFinalId);
  if ("error" in destino) return { error: destino.error };

  const quantidade = quantidadeDoFormulario(formData);
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return { error: "Informe uma quantidade maior que zero." };
  }

  const ficha = await prisma.ficha_tecnica.findFirst({
    where: { id: fichaId, produto_final_id: produtoFinalId },
  });
  if (!ficha) return { error: "Item da ficha técnica não encontrado." };

  await prisma.ficha_tecnica.update({
    where: { id: fichaId },
    data: { quantidade },
  });

  revalidarEdicao(produtoFinalId);
  return {};
}

export async function removerInsumoFicha(
  fichaId: number,
  produtoFinalId: number,
) {
  await exigirModulo("produtos");
  const destino = await garantirProdutoFinal(produtoFinalId);
  if ("error" in destino) return;

  await prisma.ficha_tecnica.deleteMany({
    where: { id: fichaId, produto_final_id: produtoFinalId },
  });

  revalidarEdicao(produtoFinalId);
}
