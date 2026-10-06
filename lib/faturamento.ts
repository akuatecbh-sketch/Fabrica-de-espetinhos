import { prisma } from "@/lib/prisma";
import { arredondarDinheiro } from "@/lib/dinheiro";
import { rotuloMesAno } from "@/lib/financeiro";
import {
  datasIsoDoPeriodo,
  formatarDataIso,
  ultimoDiaDoMesIso,
} from "@/lib/periodo";

export type LinhaFaturamentoForma = {
  forma: string;
  qtd: number;
  bruto: number;
  taxa: number;
  liquido: number;
};

export type PontoFaturamentoDia = {
  rotulo: string;
  liquido: number;
};

export type FaturamentoMes = {
  de: string;
  ate: string;
  rotuloPeriodo: string;
  linhas: LinhaFaturamentoForma[];
  total: LinhaFaturamentoForma;
  diario: PontoFaturamentoDia[];
};

const FORMAS_TABELA: { rotulo: string; nomes: string[] }[] = [
  { rotulo: "Dinheiro", nomes: ["dinheiro"] },
  { rotulo: "Débito", nomes: ["debito", "cartao debito"] },
  { rotulo: "Crédito", nomes: ["credito", "cartao credito"] },
  { rotulo: "Pix", nomes: ["pix"] },
];

function numero(valor: unknown) {
  if (typeof valor === "bigint") {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? arredondarDinheiro(n) : 0;
}

function inteiro(valor: unknown) {
  if (typeof valor === "bigint") return Number(valor);
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function chaveForma(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function rotuloForma(nome: string) {
  const chave = chaveForma(nome);
  for (const forma of FORMAS_TABELA) {
    if (forma.nomes.some((trecho) => chave.includes(trecho))) {
      return forma.rotulo;
    }
  }
  return nome;
}

function isoDaLinha(data: Date | string) {
  if (typeof data === "string") return data.slice(0, 10);
  return data.toISOString().slice(0, 10);
}

function somarLinha(
  atual: LinhaFaturamentoForma,
  extra: { qtd: number; bruto: number; taxa: number; liquido: number },
): LinhaFaturamentoForma {
  return {
    ...atual,
    qtd: atual.qtd + extra.qtd,
    bruto: arredondarDinheiro(atual.bruto + extra.bruto),
    taxa: arredondarDinheiro(atual.taxa + extra.taxa),
    liquido: arredondarDinheiro(atual.liquido + extra.liquido),
  };
}

function linhaVazia(forma: string): LinhaFaturamentoForma {
  return { forma, qtd: 0, bruto: 0, taxa: 0, liquido: 0 };
}

export function rotuloPeriodoFaturamento(de: string, ate: string) {
  const mes = de.slice(0, 7);
  if (de.endsWith("-01") && ate === ultimoDiaDoMesIso(mes)) {
    return rotuloMesAno(mes);
  }
  if (de === ate) return formatarDataIso(de);
  return `${formatarDataIso(de)} até ${formatarDataIso(ate)}`;
}

function rotuloDiaGrafico(iso: string, de: string, ate: string) {
  if (de.slice(0, 7) === ate.slice(0, 7)) return iso.slice(8);
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export async function obterFaturamentoPeriodo(
  de: string,
  ate: string,
): Promise<FaturamentoMes> {
  const [porForma, diario] = await Promise.all([
    prisma.$queryRaw<
      {
        forma_pagamento: string;
        qtd_transacoes: unknown;
        receita_bruta: unknown;
        despesa_taxa_maquininha: unknown;
        valor_liquido_recebido: unknown;
      }[]
    >`
      SELECT
        fp.nome AS forma_pagamento,
        COUNT(vp.id) AS qtd_transacoes,
        SUM(vp.valor) AS receita_bruta,
        SUM(vp.valor_taxa) AS despesa_taxa_maquininha,
        SUM(vp.valor_liquido) AS valor_liquido_recebido
      FROM venda_pagamento vp
      JOIN venda v ON v.id = vp.venda_id
      JOIN forma_pagamento fp ON fp.id = vp.forma_pagamento_id
      WHERE vp.status = 'confirmado'
        AND v.status = 'finalizada'
        AND v.finalizado_em::date >= CAST(${de} AS date)
        AND v.finalizado_em::date <= CAST(${ate} AS date)
      GROUP BY fp.nome
    `,
    prisma.$queryRaw<
      {
        data: Date | string;
        valor_liquido: unknown;
      }[]
    >`
      SELECT data, SUM(valor_liquido) AS valor_liquido
      FROM vw_faturamento_diario
      WHERE data >= CAST(${de} AS date)
        AND data <= CAST(${ate} AS date)
      GROUP BY data
      ORDER BY data
    `,
  ]);

  const mapa = new Map<string, LinhaFaturamentoForma>();
  for (const forma of FORMAS_TABELA) {
    mapa.set(forma.rotulo, linhaVazia(forma.rotulo));
  }

  for (const linha of porForma) {
    const forma = rotuloForma(linha.forma_pagamento);
    const atual = mapa.get(forma) ?? linhaVazia(forma);
    mapa.set(
      forma,
      somarLinha(atual, {
        qtd: inteiro(linha.qtd_transacoes),
        bruto: numero(linha.receita_bruta),
        taxa: numero(linha.despesa_taxa_maquininha),
        liquido: numero(linha.valor_liquido_recebido),
      }),
    );
  }

  const conhecidas = FORMAS_TABELA.map((forma) => mapa.get(forma.rotulo)!);
  const extras = [...mapa.values()].filter(
    (linha) => !FORMAS_TABELA.some((forma) => forma.rotulo === linha.forma),
  );
  const linhas = [...conhecidas, ...extras];
  const total = linhas.reduce(
    (acc, linha) => somarLinha(acc, linha),
    linhaVazia("Total"),
  );

  const porDia = new Map<string, number>();
  for (const linha of diario) {
    porDia.set(isoDaLinha(linha.data), numero(linha.valor_liquido));
  }

  const diarioPontos: PontoFaturamentoDia[] = datasIsoDoPeriodo(de, ate).map(
    (iso) => ({
      rotulo: rotuloDiaGrafico(iso, de, ate),
      liquido: porDia.get(iso) ?? 0,
    }),
  );

  return {
    de,
    ate,
    rotuloPeriodo: rotuloPeriodoFaturamento(de, ate),
    linhas,
    total,
    diario: diarioPontos,
  };
}
