import { prisma } from "@/lib/prisma";
import {
  dataLocalISO,
  dataUtcMeiaNoite,
  limitesDoMesLocal,
  limitesDoMesUtc,
  rotuloMesAno,
} from "@/lib/financeiro";

export type ResumoDreMes = {
  mes: string;
  rotuloMes: string;
  receitaBruta: number;
  taxasCartao: number;
  receitaLiquida: number;
  despesasFixas: number;
  despesasVariaveis: number;
  resultado: number;
  totalPagarAberto: number;
  totalReceberAberto: number;
  qtdContasVencidas: number;
};

function numero(valor: unknown) {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

const STATUS_ABERTO = ["aberta", "atrasada"] as const;

export async function obterResumoDreMes(mes: string): Promise<ResumoDreMes> {
  const vendas = limitesDoMesLocal(mes);
  const contas = limitesDoMesUtc(mes);
  const hoje = dataUtcMeiaNoite(dataLocalISO());
  const filtroAberto = { status: { in: [...STATUS_ABERTO] } };

  const [
    pagamentos,
    despesasFixas,
    despesasVariaveis,
    pagarAberto,
    receberAberto,
    pagarVencidas,
    receberVencidas,
  ] = await Promise.all([
    prisma.venda_pagamento.aggregate({
      where: {
        status: { not: "estornado" },
        venda: {
          status: "finalizada",
          finalizado_em: { gte: vendas.inicio, lt: vendas.fim },
        },
      },
      _sum: { valor: true, valor_taxa: true },
    }),
    prisma.conta_pagar.aggregate({
      where: {
        status: { not: "cancelada" },
        data_vencimento: { gte: contas.inicio, lt: contas.fim },
        categoria_financeira: { tipo: "custo_fixo" },
      },
      _sum: { valor: true },
    }),
    prisma.conta_pagar.aggregate({
      where: {
        status: { not: "cancelada" },
        data_vencimento: { gte: contas.inicio, lt: contas.fim },
        categoria_financeira: { tipo: "custo_variavel" },
      },
      _sum: { valor: true },
    }),
    prisma.conta_pagar.aggregate({
      where: filtroAberto,
      _sum: { valor: true },
    }),
    prisma.conta_receber.aggregate({
      where: filtroAberto,
      _sum: { valor: true },
    }),
    prisma.conta_pagar.count({
      where: { ...filtroAberto, data_vencimento: { lt: hoje } },
    }),
    prisma.conta_receber.count({
      where: { ...filtroAberto, data_vencimento: { lt: hoje } },
    }),
  ]);

  const receitaBruta = numero(pagamentos._sum.valor);
  const taxasCartao = numero(pagamentos._sum.valor_taxa);
  const receitaLiquida = receitaBruta - taxasCartao;
  const fixas = numero(despesasFixas._sum.valor);
  const variaveis = numero(despesasVariaveis._sum.valor);

  return {
    mes,
    rotuloMes: rotuloMesAno(mes),
    receitaBruta,
    taxasCartao,
    receitaLiquida,
    despesasFixas: fixas,
    despesasVariaveis: variaveis,
    resultado: receitaLiquida - fixas - variaveis,
    totalPagarAberto: numero(pagarAberto._sum.valor),
    totalReceberAberto: numero(receberAberto._sum.valor),
    qtdContasVencidas: pagarVencidas + receberVencidas,
  };
}
