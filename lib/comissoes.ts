import "server-only";
import { arredondarDinheiro } from "@/lib/dinheiro";
import {
  limitesDoPeriodoLocal,
  periodoDaUrlComPadrao,
  periodoMesAtual,
} from "@/lib/periodo";
import { prisma } from "@/lib/prisma";

export { periodoMesAtual };

export function periodoComissaoDaUrl(de?: string, ate?: string) {
  return periodoDaUrlComPadrao(de, ate, periodoMesAtual());
}

export type LinhaComissao = {
  funcionarioId: number;
  nome: string;
  quantidadeVendas: number;
  faturamentoLiquido: number;
  percentual: number;
  valorComissao: number;
};

export type RelatorioComissoes = {
  de: string;
  ate: string;
  linhas: LinhaComissao[];
  totalVendas: number;
  totalLiquido: number;
  totalComissao: number;
};

export async function obterRelatorioComissoes(
  de: string,
  ate: string,
): Promise<RelatorioComissoes> {
  const { inicio, fim } = limitesDoPeriodoLocal(de, ate);

  const funcionarios = await prisma.funcionario.findMany({
    where: {
      usuario_id: { not: null },
      percentual_comissao: { not: null },
    },
    select: {
      id: true,
      nome: true,
      usuario_id: true,
      percentual_comissao: true,
    },
    orderBy: { nome: "asc" },
  });

  const operadorIds = funcionarios
    .map((funcionario) => funcionario.usuario_id)
    .filter((id): id is number => id != null);

  const vendas =
    operadorIds.length === 0
      ? []
      : await prisma.venda.findMany({
          where: {
            status: "finalizada",
            operador_id: { in: operadorIds },
            finalizado_em: { gte: inicio, lt: fim },
          },
          select: {
            operador_id: true,
            venda_pagamento: {
              where: { status: "confirmado" },
              select: { valor_liquido: true },
            },
          },
        });

  const porOperador = new Map<number, { quantidade: number; liquido: number }>();
  for (const venda of vendas) {
    const liquido = venda.venda_pagamento.reduce(
      (soma, pagamento) => soma + Number(pagamento.valor_liquido),
      0,
    );
    const atual = porOperador.get(venda.operador_id) ?? {
      quantidade: 0,
      liquido: 0,
    };
    atual.quantidade += 1;
    atual.liquido += liquido;
    porOperador.set(venda.operador_id, atual);
  }

  const linhas = funcionarios.map((funcionario) => {
    const percentual = Number(funcionario.percentual_comissao);
    const stats = porOperador.get(funcionario.usuario_id ?? -1) ?? {
      quantidade: 0,
      liquido: 0,
    };
    const faturamentoLiquido = arredondarDinheiro(stats.liquido);
    return {
      funcionarioId: funcionario.id,
      nome: funcionario.nome,
      quantidadeVendas: stats.quantidade,
      faturamentoLiquido,
      percentual,
      valorComissao: arredondarDinheiro((faturamentoLiquido * percentual) / 100),
    };
  });

  return {
    de,
    ate,
    linhas,
    totalVendas: linhas.reduce((soma, linha) => soma + linha.quantidadeVendas, 0),
    totalLiquido: arredondarDinheiro(
      linhas.reduce((soma, linha) => soma + linha.faturamentoLiquido, 0),
    ),
    totalComissao: arredondarDinheiro(
      linhas.reduce((soma, linha) => soma + linha.valorComissao, 0),
    ),
  };
}
