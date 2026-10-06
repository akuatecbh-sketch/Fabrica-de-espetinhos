import "server-only";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { registrarAuditoria } from "@/lib/auditoria";
import { arredondarDinheiro, arredondarQuantidade } from "@/lib/dinheiro";
import { prisma } from "@/lib/prisma";

export class ErroCancelarVenda extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErroCancelarVenda";
  }
}

export type DevolucaoEstoque = {
  produto_id: number;
  quantidade: number;
};

export type ParamsCancelarVenda = {
  vendaId: number;
  usuarioId: number;
  motivo: string;
  devolucoes: DevolucaoEstoque[];
  devolverDinheiroGaveta: boolean;
  caixaAtualId: number | null;
};

export type ResultadoCancelarVenda = {
  vendaId: number;
  total: number;
  motivo: string;
  devolucoes: DevolucaoEstoque[];
  estornoDinheiro: number;
};

export type ItemDevolvivel = {
  produto_id: number;
  nome: string;
  quantidade_vendida: number;
  quantidade_devolvivel: number;
};

type ClienteTx = Prisma.TransactionClient;

const STATUS_NOTA_BLOQUEIA = new Set(["autorizada", "contingencia"]);
const STATUS_NOTA_SISTEMA = new Set(["simulado", "pendente", "rejeitada"]);

function agruparDevolucoes(devolucoes: DevolucaoEstoque[]) {
  const mapa = new Map<number, number>();
  for (const item of devolucoes) {
    const produtoId = Number(item.produto_id);
    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      throw new ErroCancelarVenda("Produto da devolução inválido.");
    }
    const quantidade = arredondarQuantidade(Number(item.quantidade));
    if (!Number.isFinite(quantidade)) {
      throw new ErroCancelarVenda("Quantidade de devolução inválida.");
    }
    mapa.set(
      produtoId,
      arredondarQuantidade((mapa.get(produtoId) ?? 0) + quantidade),
    );
  }
  return [...mapa.entries()].map(([produto_id, quantidade]) => ({
    produto_id,
    quantidade,
  }));
}

async function saldosEstoqueDaVenda(tx: ClienteTx, vendaId: number) {
  const movimentos = await tx.movimentacao_estoque.findMany({
    where: {
      origem_tipo: "venda",
      origem_id: vendaId,
      tipo: { in: ["saida_venda", "devolucao_venda"] },
    },
    select: { produto_id: true, tipo: true, quantidade: true },
  });

  const porProduto = new Map<
    number,
    { saida: number; devolvida: number }
  >();
  for (const movimento of movimentos) {
    const atual = porProduto.get(movimento.produto_id) ?? {
      saida: 0,
      devolvida: 0,
    };
    const quantidade = Number(movimento.quantidade);
    if (movimento.tipo === "saida_venda") {
      atual.saida = arredondarQuantidade(atual.saida + quantidade);
    } else {
      atual.devolvida = arredondarQuantidade(atual.devolvida + quantidade);
    }
    porProduto.set(movimento.produto_id, atual);
  }
  return porProduto;
}

export async function listarDevolvivelNaTransacao(
  tx: ClienteTx,
  vendaId: number,
): Promise<ItemDevolvivel[]> {
  const venda = await tx.venda.findUnique({
    where: { id: vendaId },
    include: {
      venda_item: {
        include: { produto: { select: { id: true, nome: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!venda) return [];

  const saldos = await saldosEstoqueDaVenda(tx, vendaId);
  const vistos = new Set<number>();
  const itens: ItemDevolvivel[] = [];

  for (const item of venda.venda_item) {
    if (vistos.has(item.produto_id)) continue;
    vistos.add(item.produto_id);
    const saldo = saldos.get(item.produto_id) ?? { saida: 0, devolvida: 0 };
    itens.push({
      produto_id: item.produto_id,
      nome: item.produto.nome,
      quantidade_vendida: saldo.saida,
      quantidade_devolvivel: arredondarQuantidade(
        saldo.saida - saldo.devolvida,
      ),
    });
  }

  for (const [produtoId, saldo] of saldos) {
    if (vistos.has(produtoId)) continue;
    const produto = await tx.produto.findUnique({
      where: { id: produtoId },
      select: { nome: true },
    });
    itens.push({
      produto_id: produtoId,
      nome: produto?.nome ?? `#${produtoId}`,
      quantidade_vendida: saldo.saida,
      quantidade_devolvivel: arredondarQuantidade(
        saldo.saida - saldo.devolvida,
      ),
    });
  }

  return itens;
}

export async function listarDevolvivel(vendaId: number) {
  return listarDevolvivelNaTransacao(
    prisma as unknown as ClienteTx,
    vendaId,
  );
}

function mensagemNotaBloqueada() {
  return "Esta venda tem NFC-e ou NF-e autorizada ou em contingência. Fale com o contador para cancelar a nota na SEFAZ antes de cancelar a venda no sistema.";
}

async function tratarNota(
  tx: ClienteTx,
  tabela: "nfce" | "nfe",
  nota: { status: string } | null,
  vendaId: number,
) {
  if (!nota) return;
  if (STATUS_NOTA_BLOQUEIA.has(nota.status)) {
    throw new ErroCancelarVenda(mensagemNotaBloqueada());
  }
  if (nota.status === "cancelada") return;
  if (!STATUS_NOTA_SISTEMA.has(nota.status)) {
    throw new ErroCancelarVenda(mensagemNotaBloqueada());
  }
  if (tabela === "nfce") {
    await tx.nfce.update({
      where: { venda_id: vendaId },
      data: {
        status: "cancelada",
        mensagem_sefaz: "Venda cancelada no sistema",
      },
    });
    return;
  }
  await tx.nfe.update({
    where: { venda_id: vendaId },
    data: {
      status: "cancelada",
      mensagem_sefaz: "Venda cancelada no sistema",
    },
  });
}

export async function cancelarVendaNaTransacao(
  tx: ClienteTx,
  params: ParamsCancelarVenda,
): Promise<ResultadoCancelarVenda> {
  const motivo = params.motivo.trim();
  if (motivo.length < 5) {
    throw new ErroCancelarVenda(
      "Informe o motivo do cancelamento (mínimo 5 caracteres).",
    );
  }

  const agora = new Date();
  const atualizada = await tx.venda.updateMany({
    where: { id: params.vendaId, status: "finalizada" },
    data: {
      status: "cancelada",
      cancelada_em: agora,
      cancelada_por_id: params.usuarioId,
      motivo_cancelamento: motivo,
      atualizado_em: agora,
    },
  });
  if (atualizada.count !== 1) {
    throw new ErroCancelarVenda(
      "Venda não está finalizada ou já foi cancelada",
    );
  }

  const venda = await tx.venda.findUniqueOrThrow({
    where: { id: params.vendaId },
    include: {
      nfce: { select: { status: true } },
      nfe: { select: { status: true } },
      venda_pagamento: {
        include: { forma_pagamento: { select: { id: true, tipo: true } } },
      },
    },
  });

  await tratarNota(tx, "nfce", venda.nfce, venda.id);
  await tratarNota(tx, "nfe", venda.nfe, venda.id);

  const saldos = await saldosEstoqueDaVenda(tx, venda.id);
  const devolucoes = agruparDevolucoes(params.devolucoes);
  for (const devolucao of devolucoes) {
    const saldo = saldos.get(devolucao.produto_id) ?? {
      saida: 0,
      devolvida: 0,
    };
    const devolvivel = arredondarQuantidade(saldo.saida - saldo.devolvida);
    if (!(devolucao.quantidade > 0) || devolucao.quantidade > devolvivel) {
      throw new ErroCancelarVenda(
        `Quantidade de devolução inválida para o produto ${devolucao.produto_id} (devolvível: ${devolvivel}).`,
      );
    }

    const produto = await tx.produto.findUniqueOrThrow({
      where: { id: devolucao.produto_id },
      select: { id: true, estoque_atual: true },
    });
    const saldoAnterior = Number(produto.estoque_atual);
    const saldoAtual = arredondarQuantidade(
      saldoAnterior + devolucao.quantidade,
    );

    await tx.produto.update({
      where: { id: produto.id },
      data: { estoque_atual: saldoAtual },
    });
    await tx.movimentacao_estoque.create({
      data: {
        produto_id: produto.id,
        tipo: "devolucao_venda",
        quantidade: devolucao.quantidade,
        saldo_anterior: saldoAnterior,
        saldo_atual: saldoAtual,
        origem_tipo: "venda",
        origem_id: venda.id,
        usuario_id: params.usuarioId,
        observacao: `Devolução da venda #${venda.id} cancelada: ${motivo}`,
      },
    });
  }

  await tx.venda_pagamento.updateMany({
    where: { venda_id: venda.id },
    data: { status: "estornado" },
  });

  const pagamentosDinheiro = venda.venda_pagamento.filter(
    (pagamento) => pagamento.forma_pagamento.tipo === "dinheiro",
  );
  let estornoDinheiro = 0;
  if (params.devolverDinheiroGaveta && pagamentosDinheiro.length > 0) {
    if (params.caixaAtualId == null) {
      throw new ErroCancelarVenda("Abra o caixa para devolver dinheiro");
    }
    estornoDinheiro = arredondarDinheiro(
      pagamentosDinheiro.reduce((soma, pagamento) => {
        return soma + Number(pagamento.valor) - Number(pagamento.troco ?? 0);
      }, 0),
    );
    if (estornoDinheiro > 0) {
      await tx.movimentacao_caixa.create({
        data: {
          caixa_id: params.caixaAtualId,
          tipo: "estorno",
          forma_pagamento_id: pagamentosDinheiro[0].forma_pagamento_id,
          valor: estornoDinheiro,
          origem_tipo: "venda",
          origem_id: venda.id,
          usuario_id: params.usuarioId,
          observacao: `Estorno de dinheiro da venda #${venda.id} cancelada`,
        },
      });
    }
  }

  return {
    vendaId: venda.id,
    total: Number(venda.total),
    motivo,
    devolucoes,
    estornoDinheiro,
  };
}

export async function cancelarVendaFinalizada(params: ParamsCancelarVenda) {
  const resultado = await prisma.$transaction(
    async (tx) => cancelarVendaNaTransacao(tx, params),
    { timeout: 30000 },
  );

  await registrarAuditoria({
    usuarioId: params.usuarioId,
    acao: "venda.cancelar",
    entidadeTipo: "venda",
    entidadeId: resultado.vendaId,
    valorAnterior: { status: "finalizada", total: resultado.total },
    valorNovo: {
      status: "cancelada",
      motivo: resultado.motivo,
      devolucoes: resultado.devolucoes,
      estorno_dinheiro: resultado.estornoDinheiro,
    },
  });

  revalidatePath("/vendas/hoje");
  revalidatePath(`/vendas/${resultado.vendaId}`);
  revalidatePath("/caixa");
  revalidatePath("/estoque");
  revalidatePath("/financeiro");
  revalidatePath("/");
  revalidatePath("/painel");
  revalidatePath("/relatorios");

  return resultado;
}
