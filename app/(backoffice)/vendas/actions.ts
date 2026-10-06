"use server";

import { obterCaixaAberto } from "@/lib/caixa";
import {
  cancelarVendaFinalizada,
  ErroCancelarVenda,
  type DevolucaoEstoque,
} from "@/lib/cancelar-venda";
import { temAcesso } from "@/lib/permissoes";
import { obterUsuarioSessao } from "@/lib/usuario-sessao";

export type CancelarVendaFinalizadaState = {
  error?: string;
  ok?: boolean;
};

export async function cancelarVendaFinalizadaAction(params: {
  vendaId: number;
  motivo: string;
  devolucoes: DevolucaoEstoque[];
  devolverDinheiroGaveta: boolean;
}): Promise<CancelarVendaFinalizadaState> {
  const usuario = await obterUsuarioSessao();
  if (!(await temAcesso(usuario.id, "cancelar_venda"))) {
    return {
      error: "Você não tem permissão para cancelar vendas finalizadas.",
    };
  }

  const vendaId = Number(params.vendaId);
  if (!Number.isInteger(vendaId) || vendaId <= 0) {
    return { error: "Venda inválida." };
  }

  const motivo = String(params.motivo ?? "").trim();
  if (motivo.length < 5) {
    return { error: "Informe o motivo do cancelamento (mínimo 5 caracteres)." };
  }

  if (!Array.isArray(params.devolucoes)) {
    return { error: "Devoluções inválidas." };
  }

  const devolucoes: DevolucaoEstoque[] = [];
  for (const item of params.devolucoes) {
    const produto_id = Number(item.produto_id);
    const quantidade = Number(item.quantidade);
    if (!Number.isInteger(produto_id) || produto_id <= 0) {
      return { error: "Produto da devolução inválido." };
    }
    if (!Number.isFinite(quantidade)) {
      return { error: "Quantidade de devolução inválida." };
    }
    devolucoes.push({ produto_id, quantidade });
  }

  const caixa = await obterCaixaAberto();
  try {
    await cancelarVendaFinalizada({
      vendaId,
      usuarioId: usuario.id,
      motivo,
      devolucoes,
      devolverDinheiroGaveta: Boolean(params.devolverDinheiroGaveta),
      caixaAtualId: caixa?.id ?? null,
    });
    return { ok: true };
  } catch (erro) {
    if (erro instanceof ErroCancelarVenda) {
      return { error: erro.message };
    }
    throw erro;
  }
}
