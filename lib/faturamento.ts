import { prisma } from "@/lib/prisma";
import { arredondarDinheiro } from "@/lib/dinheiro";
import { rotuloMesAno } from "@/lib/financeiro";

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
  mes: string;
  rotuloMes: string;
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

function proximoMesISO(mesIso: string) {
  const ano = Number(mesIso.slice(0, 4));
  const mes = Number(mesIso.slice(5, 7));
  if (mes === 12) return `${ano + 1}-01`;
  return `${ano}-${String(mes + 1).padStart(2, "0")}`;
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

export async function obterFaturamentoMes(mes: string): Promise<FaturamentoMes> {
  const inicio = `${mes}-01`;
  const proximo = `${proximoMesISO(mes)}-01`;

  const [mensal, diario] = await Promise.all([
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
        forma_pagamento,
        qtd_transacoes,
        receita_bruta,
        despesa_taxa_maquininha,
        valor_liquido_recebido
      FROM vw_export_contabilidade_mensal
      WHERE mes_referencia >= CAST(${inicio} AS date)
        AND mes_referencia < CAST(${proximo} AS date)
    `,
    prisma.$queryRaw<
      {
        data: Date | string;
        valor_liquido: unknown;
      }[]
    >`
      SELECT data, SUM(valor_liquido) AS valor_liquido
      FROM vw_faturamento_diario
      WHERE data >= CAST(${inicio} AS date)
        AND data < CAST(${proximo} AS date)
      GROUP BY data
      ORDER BY data
    `,
  ]);

  const mapa = new Map<string, LinhaFaturamentoForma>();
  for (const forma of FORMAS_TABELA) {
    mapa.set(forma.rotulo, linhaVazia(forma.rotulo));
  }

  for (const linha of mensal) {
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
  const total = linhas.reduce((acc, linha) => somarLinha(acc, linha), linhaVazia("Total"));

  const porDia = new Map<string, number>();
  for (const linha of diario) {
    porDia.set(isoDaLinha(linha.data), numero(linha.valor_liquido));
  }

  const ano = Number(mes.slice(0, 4));
  const mesNum = Number(mes.slice(5, 7));
  const ultimoDia = new Date(Date.UTC(ano, mesNum, 0)).getUTCDate();
  const pontos: PontoFaturamentoDia[] = [];
  for (let dia = 1; dia <= ultimoDia; dia += 1) {
    const iso = `${mes}-${String(dia).padStart(2, "0")}`;
    pontos.push({
      rotulo: String(dia).padStart(2, "0"),
      liquido: porDia.get(iso) ?? 0,
    });
  }

  return {
    mes,
    rotuloMes: rotuloMesAno(mes),
    linhas,
    total,
    diario: pontos,
  };
}
