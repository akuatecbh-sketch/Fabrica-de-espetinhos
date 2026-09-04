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
  };
}
