import { prisma } from "@/lib/prisma";
import { arredondarDinheiro } from "@/lib/dinheiro";

export type LinhaFormaCaixa = {
  forma_pagamento: string;
  valor_bruto: number;
  valor_taxa: number;
  valor_liquido: number;
};

export type ResumoCaixa = {
  faturamento_bruto: number;
  total_taxas: number;
  faturamento_liquido: number;
  formas: LinhaFormaCaixa[];
  vendas_dinheiro: number;
  valor_fechamento_sistema: number;
};

function numero(valor: unknown) {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? arredondarDinheiro(n) : 0;
}

const FORMAS_ESPERADAS = [
  "Dinheiro",
  "Cartão Débito",
  "Cartão Crédito",
  "Pix",
];

export async function obterResumoCaixa(
  caixaId: number,
  valorAbertura: { toString(): string },
): Promise<ResumoCaixa> {
  const [totais, linhas] = await Promise.all([
    prisma.$queryRaw<
      {
        faturamento_bruto: unknown;
        total_taxas: unknown;
        faturamento_liquido: unknown;
      }[]
    >`
      SELECT faturamento_bruto, total_taxas, faturamento_liquido
      FROM vw_fechamento_caixa_total
      WHERE caixa_id = ${caixaId}
    `,
    prisma.$queryRaw<
      {
        forma_pagamento: string;
        valor_bruto: unknown;
        valor_taxa: unknown;
        valor_liquido: unknown;
      }[]
    >`
      SELECT forma_pagamento,
             SUM(valor_bruto) AS valor_bruto,
             SUM(valor_taxa) AS valor_taxa,
             SUM(valor_liquido) AS valor_liquido
      FROM vw_fechamento_caixa_formas
      WHERE caixa_id = ${caixaId}
      GROUP BY forma_pagamento
      ORDER BY forma_pagamento
    `,
  ]);

  const total = totais[0];
  const mapa = new Map<string, LinhaFormaCaixa>();
  for (const nome of FORMAS_ESPERADAS) {
    mapa.set(nome, {
      forma_pagamento: nome,
      valor_bruto: 0,
      valor_taxa: 0,
      valor_liquido: 0,
    });
  }
  for (const linha of linhas) {
    const atual = mapa.get(linha.forma_pagamento) ?? {
      forma_pagamento: linha.forma_pagamento,
      valor_bruto: 0,
      valor_taxa: 0,
      valor_liquido: 0,
    };
    atual.valor_bruto = numero(linha.valor_bruto);
    atual.valor_taxa = numero(linha.valor_taxa);
    atual.valor_liquido = numero(linha.valor_liquido);
    mapa.set(linha.forma_pagamento, atual);
  }

  const formas = [...mapa.values()];
  const vendas_dinheiro =
    formas.find((forma) => forma.forma_pagamento.toLowerCase() === "dinheiro")
      ?.valor_bruto ?? 0;

  return {
    faturamento_bruto: numero(total?.faturamento_bruto),
    total_taxas: numero(total?.total_taxas),
    faturamento_liquido: numero(total?.faturamento_liquido),
    formas,
    vendas_dinheiro,
    valor_fechamento_sistema: arredondarDinheiro(
      numero(valorAbertura) + vendas_dinheiro,
    ),
  };
}
