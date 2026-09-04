import { prisma } from "@/lib/prisma";
import { SELECT_USUARIO_RELACAO } from "@/lib/visibilidade";

function numero(valor: unknown) {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function limitesDoDiaLocal(agora = new Date()) {
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);
  return { inicio, fim };
}

export type ResumoVendasHoje = {
  quantidade: number;
  faturamentoBruto: number;
  faturamentoLiquido: number;
};

export async function obterResumoVendasHoje(): Promise<ResumoVendasHoje> {
  const { inicio, fim } = limitesDoDiaLocal();
  const [quantidade, faturamento] = await Promise.all([
    prisma.venda.count({
      where: {
        status: "finalizada",
        finalizado_em: { gte: inicio, lt: fim },
      },
    }),
    prisma.venda_pagamento.aggregate({
      where: {
        status: "confirmado",
        venda: {
          status: "finalizada",
          finalizado_em: { gte: inicio, lt: fim },
        },
      },
      _sum: { valor: true, valor_liquido: true },
    }),
  ]);

  return {
    quantidade,
    faturamentoBruto: numero(faturamento._sum.valor),
    faturamentoLiquido: numero(faturamento._sum.valor_liquido),
  };
}

export async function obterVendasHoje() {
  const { inicio, fim } = limitesDoDiaLocal();
  return prisma.venda.findMany({
    where: {
      status: "finalizada",
      finalizado_em: { gte: inicio, lt: fim },
    },
    orderBy: { finalizado_em: "desc" },
    include: {
      cliente: { select: { nome: true } },
      usuario: { select: SELECT_USUARIO_RELACAO },
      nfce: {
        select: {
          status: true,
          mensagem_sefaz: true,
          danfe_url: true,
        },
      },
      venda_item: {
        include: { produto: { select: { nome: true } } },
        orderBy: { id: "asc" },
      },
      venda_pagamento: {
        where: { status: "confirmado" },
        include: { forma_pagamento: { select: { nome: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
}

export function totaisPagamento(pagamentos: {
  valor: { toString(): string };
  valor_taxa: { toString(): string };
  valor_liquido: { toString(): string };
}[]) {
  return pagamentos.reduce(
    (acc, pagamento) => ({
      bruto: acc.bruto + numero(pagamento.valor),
      taxa: acc.taxa + numero(pagamento.valor_taxa),
      liquido: acc.liquido + numero(pagamento.valor_liquido),
    }),
    { bruto: 0, taxa: 0, liquido: 0 },
  );
}
