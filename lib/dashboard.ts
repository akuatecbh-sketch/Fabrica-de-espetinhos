import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { obterCaixaAberto } from "@/lib/caixa";
import { obterResumoVendasHoje } from "@/lib/vendas-hoje";
import { limiteAlertaFerias } from "@/lib/rh";
import {
  obterProdutosMaisVendidos,
  periodoPadraoRelatorio,
} from "@/lib/relatorios";

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

export type PontoProdutoMaisVendido = {
  nome: string;
  quantidade: number;
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
  produtosMaisVendidos: PontoProdutoMaisVendido[];
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

function inicioLocalMaisDias(dias: number, agora = new Date()) {
  const data = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  data.setDate(data.getDate() + dias);
  return data;
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function rotuloDiaCurto(data: Date) {
  return `${DIAS_SEMANA[data.getDay()]} ${String(data.getDate()).padStart(2, "0")}`;
}

type ResumoContasSql = {
  qtd_aberto: number;
  total_aberto: unknown;
  qtd_7: number;
  total_7: unknown;
  qtd_atrasadas: number;
  total_atrasadas: unknown;
};

function resumoContasDaLinha(linha: ResumoContasSql | undefined): ResumoContas {
  return {
    temRegistro: numero(linha?.qtd_aberto) > 0,
    totalAberto: numero(linha?.total_aberto),
    qtdProximos7: numero(linha?.qtd_7),
    totalProximos7: numero(linha?.total_7),
    qtdAtrasadas: numero(linha?.qtd_atrasadas),
    totalAtrasadas: numero(linha?.total_atrasadas),
  };
}

async function resumoContasPagar(hoje: Date, em7dias: Date): Promise<ResumoContas> {
  const [linha] = await prisma.$queryRaw<ResumoContasSql[]>`
    SELECT
      COUNT(*)::int AS qtd_aberto,
      COALESCE(SUM(valor), 0) AS total_aberto,
      COUNT(*) FILTER (
        WHERE data_vencimento >= ${hoje} AND data_vencimento <= ${em7dias}
      )::int AS qtd_7,
      COALESCE(SUM(valor) FILTER (
        WHERE data_vencimento >= ${hoje} AND data_vencimento <= ${em7dias}
      ), 0) AS total_7,
      COUNT(*) FILTER (WHERE data_vencimento < ${hoje})::int AS qtd_atrasadas,
      COALESCE(SUM(valor) FILTER (WHERE data_vencimento < ${hoje}), 0) AS total_atrasadas
    FROM conta_pagar
    WHERE status = 'aberta'
  `;
  return resumoContasDaLinha(linha);
}

async function resumoContasReceber(hoje: Date, em7dias: Date): Promise<ResumoContas> {
  const [linha] = await prisma.$queryRaw<ResumoContasSql[]>`
    SELECT
      COUNT(*)::int AS qtd_aberto,
      COALESCE(SUM(valor), 0) AS total_aberto,
      COUNT(*) FILTER (
        WHERE data_vencimento >= ${hoje} AND data_vencimento <= ${em7dias}
      )::int AS qtd_7,
      COALESCE(SUM(valor) FILTER (
        WHERE data_vencimento >= ${hoje} AND data_vencimento <= ${em7dias}
      ), 0) AS total_7,
      COUNT(*) FILTER (WHERE data_vencimento < ${hoje})::int AS qtd_atrasadas,
      COALESCE(SUM(valor) FILTER (WHERE data_vencimento < ${hoje}), 0) AS total_atrasadas
    FROM conta_receber
    WHERE status = 'aberta'
  `;
  return resumoContasDaLinha(linha);
}

function casosFaturamento7Dias() {
  const partes: Prisma.Sql[] = [];
  for (let i = 0; i < 7; i++) {
    const de = inicioLocalMaisDias(i - 6);
    const ate = inicioLocalMaisDias(i - 5);
    partes.push(
      Prisma.sql`WHEN v.finalizado_em >= ${de} AND v.finalizado_em < ${ate} THEN ${i}`,
    );
  }
  return Prisma.join(partes, " ");
}

export async function faturamentoUltimos7Dias(): Promise<PontoFaturamentoDia[]> {
  const inicio = inicioLocalMaisDias(-6);
  const fim = inicioLocalMaisDias(1);
  const linhas = await prisma.$queryRaw<{ dia_idx: number; bruto: unknown; liquido: unknown }[]>`
    SELECT
      CASE ${casosFaturamento7Dias()} END AS dia_idx,
      SUM(vp.valor) AS bruto,
      SUM(vp.valor_liquido) AS liquido
    FROM venda_pagamento vp
    INNER JOIN venda v ON v.id = vp.venda_id
    WHERE vp.status = 'confirmado'
      AND v.status = 'finalizada'
      AND v.finalizado_em >= ${inicio}
      AND v.finalizado_em < ${fim}
    GROUP BY 1
  `;

  const porIndice = new Map(
    linhas
      .filter((linha) => linha.dia_idx != null)
      .map((linha) => [
        Number(linha.dia_idx),
        { bruto: numero(linha.bruto), liquido: numero(linha.liquido) },
      ]),
  );

  const pontos: PontoFaturamentoDia[] = [];
  for (let i = 0; i < 7; i++) {
    const dia = inicioLocalMaisDias(i - 6);
    const valores = porIndice.get(i) ?? { bruto: 0, liquido: 0 };
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
  const linhas = await prisma.$queryRaw<{ nome: string; valor: unknown }[]>`
    SELECT fp.nome, SUM(vp.valor) AS valor
    FROM venda_pagamento vp
    INNER JOIN venda v ON v.id = vp.venda_id
    INNER JOIN forma_pagamento fp ON fp.id = vp.forma_pagamento_id
    WHERE vp.status = 'confirmado'
      AND v.status = 'finalizada'
      AND v.finalizado_em >= ${inicio}
      AND v.finalizado_em < ${fim}
    GROUP BY fp.nome
    HAVING SUM(vp.valor) > 0
    ORDER BY SUM(vp.valor) DESC
  `;

  return linhas.map((linha) => ({
    nome: linha.nome,
    valor: numero(linha.valor),
  }));
}

function criticosDoJson(valor: unknown): ProdutoEstoqueBaixo[] {
  const bruto = typeof valor === "string" ? JSON.parse(valor) : valor;
  if (!Array.isArray(bruto)) return [];
  return bruto.map((linha: { id: number; nome: string; estoque_atual: unknown; estoque_minimo: unknown }) => ({
    id: Number(linha.id),
    nome: String(linha.nome),
    estoque_atual: numero(linha.estoque_atual),
    estoque_minimo: numero(linha.estoque_minimo),
  }));
}

export async function obterDadosDashboard(): Promise<DadosDashboard> {
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const em7dias = new Date(inicioHoje);
  em7dias.setDate(em7dias.getDate() + 7);
  const hojeUtc = dataUtcMeiaNoite(dataLocalISO(inicioHoje));
  const em7Utc = dataUtcMeiaNoite(dataLocalISO(em7dias));
  const periodoMaisVendidos = periodoPadraoRelatorio();

  const caixa = await obterCaixaAberto();
  const [
    vendasHoje,
    contasPagar,
    contasReceber,
    estoque,
    rh,
    pedidosEnviados,
  ] = await Promise.all([
    obterResumoVendasHoje(),
    resumoContasPagar(hojeUtc, em7Utc),
    resumoContasReceber(hojeUtc, em7Utc),
    prisma.$queryRaw<{ quantidade: number; criticos: unknown }[]>`
      WITH baixos AS (
        SELECT
          id,
          nome,
          estoque_atual,
          COALESCE(estoque_minimo, 0) AS estoque_minimo
        FROM produto
        WHERE ativo = true
          AND estoque_atual < COALESCE(estoque_minimo, 0)
      )
      SELECT
        (SELECT COUNT(*)::int FROM baixos) AS quantidade,
        COALESCE(
          (
            SELECT json_agg(t)
            FROM (
              SELECT id, nome, estoque_atual, estoque_minimo
              FROM baixos
              ORDER BY (estoque_minimo - estoque_atual) DESC, nome
              LIMIT 5
            ) t
          ),
          '[]'::json
        ) AS criticos
    `,
    prisma.$queryRaw<{ aniversariantes: number; ferias: number }[]>`
      SELECT
        (
          SELECT COUNT(*)::int
          FROM funcionario
          WHERE ativo = true
            AND EXTRACT(MONTH FROM data_nascimento) = ${inicioHoje.getMonth() + 1}
        ) AS aniversariantes,
        (
          SELECT COUNT(*)::int
          FROM ferias f
          INNER JOIN funcionario fu ON fu.id = f.funcionario_id
          WHERE f.status = 'pendente'
            AND f.periodo_aquisitivo_fim <= ${limiteAlertaFerias(hojeUtc)}
            AND fu.ativo = true
        ) AS ferias
    `,
    prisma.pedido.count({ where: { status: "enviado" } }),
  ]);

  const [faturamento7Dias, vendasPorForma, maisVendidos] = await Promise.all([
    faturamentoUltimos7Dias(),
    vendasPorForma30Dias(),
    obterProdutosMaisVendidos({
      de: periodoMaisVendidos.de,
      ate: periodoMaisVendidos.ate,
      limite: 5,
    }),
  ]);

  const estoqueLinha = estoque[0];
  const rhLinha = rh[0];

  return {
    vendasHoje,
    caixa,
    contasPagar,
    contasReceber,
    estoqueBaixo: {
      quantidade: numero(estoqueLinha?.quantidade),
      criticos: criticosDoJson(estoqueLinha?.criticos),
    },
    rh: {
      aniversariantesMes: numero(rhLinha?.aniversariantes),
      feriasPrazo: numero(rhLinha?.ferias),
    },
    pedidosEnviados,
    faturamento7Dias,
    vendasPorForma,
    produtosMaisVendidos: maisVendidos.itens.map((item) => ({
      nome: item.nome,
      quantidade: item.quantidade,
    })),
  };
}

export type DadosPainelTv = {
  vendasHoje: DadosDashboard["vendasHoje"];
  faturamento7Dias: PontoFaturamentoDia[];
};

export async function obterDadosPainelTv(): Promise<DadosPainelTv> {
  const [vendasHoje, faturamento7Dias] = await Promise.all([
    obterResumoVendasHoje(),
    faturamentoUltimos7Dias(),
  ]);
  return { vendasHoje, faturamento7Dias };
}
