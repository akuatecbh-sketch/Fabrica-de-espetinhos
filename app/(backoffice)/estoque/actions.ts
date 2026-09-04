"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { arredondarQuantidade } from "@/lib/dinheiro";
import { formatarQuantidade } from "@/lib/format";
import { ehTipoAjuste } from "@/lib/estoque";
import { exigirEstoque } from "@/lib/sessao";

export type AjusteFormState = {
  error?: string;
  sucesso?: {
    produto: string;
    saldoAnterior: number;
    saldoAtual: number;
  };
};

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

export async function ajustarEstoque(
  _estado: AjusteFormState,
  formData: FormData,
): Promise<AjusteFormState> {
  const usuario = await exigirEstoque();
  const produtoId = Number(formData.get("produto_id"));
  const tipo = texto(formData, "tipo");
  const quantidadeBruta = Number(texto(formData, "quantidade").replace(",", "."));
  const observacao = texto(formData, "observacao");

  if (!Number.isInteger(produtoId) || produtoId <= 0) {
    return { error: "Selecione um produto." };
  }
  if (!ehTipoAjuste(tipo)) {
    return { error: "Tipo de ajuste inválido." };
  }
  if (!Number.isFinite(quantidadeBruta) || quantidadeBruta <= 0) {
    return { error: "Informe uma quantidade maior que zero." };
  }
  if (!observacao) {
    return { error: "Informe o motivo do ajuste." };
  }
  if (observacao.length > 500) {
    return { error: "A observação deve ter no máximo 500 caracteres." };
  }

  const quantidade = arredondarQuantidade(quantidadeBruta);

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const produto = await tx.produto.findUnique({
        where: { id: produtoId },
      });
      if (!produto || !produto.ativo) {
        throw new Error("PRODUTO_INVALIDO");
      }

      const saldoAnterior = Number(produto.estoque_atual);
      const baixa = tipo !== "ajuste_positivo";
      if (baixa && quantidade > saldoAnterior) {
        throw new Error(`ESTOQUE_INSUFICIENTE:${saldoAnterior}`);
      }

      const saldoAtual = arredondarQuantidade(
        baixa ? saldoAnterior - quantidade : saldoAnterior + quantidade,
      );

      await tx.produto.update({
        where: { id: produto.id },
        data: { estoque_atual: saldoAtual },
      });

      await tx.movimentacao_estoque.create({
        data: {
          produto_id: produto.id,
          tipo,
          quantidade,
          saldo_anterior: saldoAnterior,
          saldo_atual: saldoAtual,
          origem_tipo: "ajuste_manual",
          origem_id: null,
          usuario_id: usuario.id,
          observacao,
        },
      });

      return {
        produto: produto.nome,
        saldoAnterior,
        saldoAtual,
      };
    });

    revalidatePath("/estoque", "layout");
    revalidatePath("/produtos", "layout");
    revalidatePath("/");
    return { sucesso: resultado };
  } catch (erro) {
    if (erro instanceof Error && erro.message === "PRODUTO_INVALIDO") {
      return { error: "Produto inválido ou inativo." };
    }
    if (erro instanceof Error && erro.message.startsWith("ESTOQUE_INSUFICIENTE:")) {
      const maximo = Number(erro.message.split(":")[1] ?? 0);
      return {
        error: `O ajuste deixaria o estoque negativo. Máximo que pode ser baixado: ${formatarQuantidade(maximo)}.`,
      };
    }
    throw erro;
  }
}
