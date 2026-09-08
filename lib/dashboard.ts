import { prisma } from "@/lib/prisma";
import { obterCaixaAberto } from "@/lib/caixa";
import { obterResumoVendasHoje } from "@/lib/vendas-hoje";
import { limiteAlertaFerias } from "@/lib/rh";

export type ResumoContas = {
  temRegistro: boolean;
  totalAberto: number;
  qtdProximos7: number;
  totalProximos7: number;
  qtdAtrasadas: number;
  totalAtrasadas: number;
};

export type ProdutoEstoqueBaixo = {
  id: number;
  nome: string;
  estoque_atual: number;
  estoque_minimo: number;
};

export type PontoFaturamentoDia = {
  rotulo: string;
  bruto: number;
  liquido: number;
};

export type PontoFormaPagamento = {
  nome: string;
  valor: number;
};

export type DadosDashboard = {
  vendasHoje: {
    quantidade: number;
    faturamentoBruto: number;
    faturamentoLiquido: number;
  };
  caixa: Awaited<ReturnType<typeof obterCaixaAberto>>;
  contasPagar: ResumoContas;
  contasReceber: ResumoContas;
  estoqueBaixo: {
    quantidade: number;
    criticos: ProdutoEstoqueBaixo[];
  };
  rh: {
    aniversariantesMes: number;
    feriasPrazo: number;
  };
  pedidosEnviados: number;
  faturamento7Dias: PontoFaturamentoDia[];
  vendasPorForma: PontoFormaPagamento[];
};

function numero(valor: unknown) {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function dataUtcMeiaNoite(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

function montarResumoContas(partes: {
  abertas: { _sum: { valor: unknown }; _count: { _all: number } };
  proximos7: { _sum: { valor: unknown }; _count: { _all: number } };
  atrasadas: { _sum: { valor: unknown }; _count: { _all: number } };
}): ResumoContas {
  return {
    temRegistro: partes.abertas._count._all > 0,
    totalAberto: numero(partes.abertas._sum.valor),
    qtdProximos7: partes.proximos7._count._all,
    totalProximos7: numero(partes.proximos7._sum.valor),
    qtdAtrasadas: partes.atrasadas._count._all,
    totalAtrasadas: numero(partes.atrasadas._sum.valor),
  };
}

async function resumoContasPagar(hoje: Date, em7dias: Date): Promise<ResumoContas> {
  const filtroAberto = { status: "aberta" as const };
  const [abertas, proximos7, atrasadas] = await Promise.all([
    prisma.conta_pagar.aggregate({
      where: filtroAberto,
      _sum: { valor: true },
      _count: { _all: true },
    }),
    prisma.conta_pagar.aggregate({
      where: { ...filtroAberto, data_vencimento: { gte: hoje, lte: em7dias } },
      _sum: { valor: true },
      _count: { _all: true },
    }),
    prisma.conta_pagar.aggregate({
      where: { ...filtroAberto, data_vencimento: { lt: hoje } },
      _sum: { valor: true },
      _count: { _all: true },
    }),
  ]);
  return montarResumoContas({ abertas, proximos7, atrasadas });
}

async function resumoContasReceber(hoje: Date, em7dias: Date): Promise<ResumoContas> {
  const filtroAberto = { status: "aberta" as const };
  const [abertas, proximos7, atrasadas] = await Promise.all([
    prisma.conta_receber.aggregate({
      where: filtroAberto,
      _sum: { valor: true },
      _count: { _all: true },
    }),
    prisma.conta_receber.aggregate({
      where: { ...filtroAberto, data_vencimento: { gte: hoje, lte: em7dias } },
      _sum: { valor: true },
      _count: { _all: true },
    }),
    prisma.conta_receber.aggregate({
      where: { ...filtroAberto, data_vencimento: { lt: hoje } },
      _sum: { valor: true },
      _count: { _all: true },
    }),
  ]);
  return montarResumoContas({ abertas, proximos7, atrasadas });
}

function inicioLocalMaisDias(dias: number, agora = new Date()) {
  const data = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  data.setDate(data.getDate() + dias);
  return data;
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function rotuloDiaCurto(data: Date) {
  return `${DIAS_SEMANA[data.getDay()]} ${String(data.getDate()).padStart(2, "0")}`;
}

async function faturamentoUltimos7Dias(): Promise<PontoFaturamentoDia[]> {
  const inicio = inicioLocalMaisDias(-6);
  const fim = inicioLocalMaisDias(1);
  const linhas = await prisma.venda_pagamento.findMany({
    where: {
      status: "confirmado",
      venda: {
        status: "finalizada",
        finalizado_em: { gte: inicio, lt: fim },
      },
    },
    select: {
      valor: true,
      valor_liquido: true,
      venda: { select: { finalizado_em: true } },
    },
  });

  const porDia = new Map<string, { bruto: number; liquido: number }>();
  for (const linha of linhas) {
    const quando = linha.venda.finalizado_em;
    if (!quando) continue;
    const chave = dataLocalISO(quando);
    const atual = porDia.get(chave) ?? { bruto: 0, liquido: 0 };
    atual.bruto += numero(linha.valor);
    atual.liquido += numero(linha.valor_liquido);
    porDia.set(chave, atual);
  }

  const pontos: PontoFaturamentoDia[] = [];
  for (let i = -6; i <= 0; i++) {
    const dia = inicioLocalMaisDias(i);
    const valores = porDia.get(dataLocalISO(dia)) ?? { bruto: 0, liquido: 0 };
    pontos.push({
      rotulo: rotuloDiaCurto(dia),
      bruto: valores.bruto,
      liquido: valores.liquido,
    });
  }
  return pontos;
}

async function vendasPorForma30Dias(): Promise<PontoFormaPagamento[]> {
  const inicio = inicioLocalMaisDias(-29);
  const fim = inicioLocalMaisDias(1);
  const linhas = await prisma.venda_pagamento.findMany({
    where: {
      status: "confirmado",
      venda: {
        status: "finalizada",
        finalizado_em: { gte: inicio, lt: fim },
      },
    },
    select: {
      valor: true,
      forma_pagamento: { select: { nome: true } },
    },
  });

  const porForma = new Map<string, number>();
  for (const linha of linhas) {
    const nome = linha.forma_pagamento.nome;
    porForma.set(nome, (porForma.get(nome) ?? 0) + numero(linha.valor));
  }

  return [...porForma.entries()]
    .map(([nome, valor]) => ({ nome, valor }))
    .filter((ponto) => ponto.valor > 0)
    .sort((a, b) => b.valor - a.valor);
}

export async function obterDadosDashboard(): Promise<DadosDashboard> {
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const em7dias = new Date(inicioHoje);
  em7dias.setDate(em7dias.getDate() + 7);
  const hojeUtc = dataUtcMeiaNoite(dataLocalISO(inicioHoje));
  const em7Utc = dataUtcMeiaNoite(dataLocalISO(em7dias));

  const [
    vendasHoje,
    caixa,
    contasPagar,
    contasReceber,
    estoqueQtd,
    estoqueCriticos,
    aniversariantes,
    feriasPrazo,
    pedidosEnviados,
    faturamento7Dias,
    vendasPorForma,
  ] = await Promise.all([
    obterResumoVendasHoje(),
    obterCaixaAberto(),
    resumoContasPagar(hojeUtc, em7Utc),
    resumoContasReceber(hojeUtc, em7Utc),
    prisma.$queryRaw<{ quantidade: unknown }[]>`
      SELECT COUNT(*)::int AS quantidade
      FROM produto
      WHERE ativo = true
        AND estoque_atual < COALESCE(estoque_minimo, 0)
    `,
    prisma.$queryRaw<
      {
        id: number;
        nome: string;
        estoque_atual: unknown;
        estoque_minimo: unknown;
      }[]
    >`
      SELECT
        id,
        nome,
        estoque_atual,
        COALESCE(estoque_minimo, 0) AS estoque_minimo
      FROM produto
      WHERE ativo = true
        AND estoque_atual < COALESCE(estoque_minimo, 0)
      ORDER BY (COALESCE(estoque_minimo, 0) - estoque_atual) DESC, nome
      LIMIT 5
    `,
    prisma.$queryRaw<{ quantidade: unknown }[]>`
      SELECT COUNT(*)::int AS quantidade
      FROM funcionario
      WHERE ativo = true
        AND EXTRACT(MONTH FROM data_nascimento) = ${inicioHoje.getMonth() + 1}
    `,
    prisma.ferias.count({
      where: {
        status: "pendente",
        periodo_aquisitivo_fim: { lte: limiteAlertaFerias(hojeUtc) },
        funcionario: { ativo: true },
      },
    }),
    prisma.pedido.count({ where: { status: "enviado" } }),
    faturamentoUltimos7Dias(),
    vendasPorForma30Dias(),
  ]);

  const criticos = estoqueCriticos.map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    estoque_atual: numero(linha.estoque_atual),
    estoque_minimo: numero(linha.estoque_minimo),
  }));

  const quantidadeEstoque = numero(estoqueQtd[0]?.quantidade);

  return {
    vendasHoje,
    caixa,
    contasPagar,
    contasReceber,
    estoqueBaixo: {
      quantidade: quantidadeEstoque,
      criticos,
    },
    rh: {
      aniversariantesMes: numero(aniversariantes[0]?.quantidade),
      feriasPrazo,
    },
    pedidosEnviados,
    faturamento7Dias,
    vendasPorForma,
  };
}
