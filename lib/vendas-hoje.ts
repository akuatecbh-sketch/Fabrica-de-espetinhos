import { limitesDoPeriodoLocal } from "@/lib/periodo";
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

function limitesConsulta(periodo?: { de: string; ate: string }) {
  if (periodo) return limitesDoPeriodoLocal(periodo.de, periodo.ate);
  return limitesDoDiaLocal();
}

export async function obterResumoVendasHoje(
  periodo?: { de: string; ate: string },
): Promise<ResumoVendasHoje> {
  const { inicio, fim } = limitesConsulta(periodo);
  const [linha] = await prisma.$queryRaw<
    { quantidade: number; bruto: unknown; liquido: unknown }[]
  >`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM venda
        WHERE status = 'finalizada'
          AND finalizado_em >= ${inicio}
          AND finalizado_em < ${fim}
      ) AS quantidade,
      COALESCE((
        SELECT SUM(vp.valor)
        FROM venda_pagamento vp
        INNER JOIN venda v ON v.id = vp.venda_id
        WHERE vp.status = 'confirmado'
          AND v.status = 'finalizada'
          AND v.finalizado_em >= ${inicio}
          AND v.finalizado_em < ${fim}
      ), 0) AS bruto,
      COALESCE((
        SELECT SUM(vp.valor_liquido)
        FROM venda_pagamento vp
        INNER JOIN venda v ON v.id = vp.venda_id
        WHERE vp.status = 'confirmado'
          AND v.status = 'finalizada'
          AND v.finalizado_em >= ${inicio}
          AND v.finalizado_em < ${fim}
      ), 0) AS liquido
  `;

  return {
    quantidade: numero(linha?.quantidade),
    faturamentoBruto: numero(linha?.bruto),
    faturamentoLiquido: numero(linha?.liquido),
  };
}

export async function obterVendasHoje(
  periodo?: { de: string; ate: string },
  opcoes?: { incluirCanceladas?: boolean },
) {
  const { inicio, fim } = limitesConsulta(periodo);
  return prisma.venda.findMany({
    where: {
      status: opcoes?.incluirCanceladas
        ? { in: ["finalizada", "cancelada"] }
        : "finalizada",
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
        include: {
          produto: { select: { nome: true, vendido_por_peso: true } },
        },
        orderBy: { id: "asc" },
      },
      venda_pagamento: {
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

export function rotuloStatusVenda(status: string) {
  if (status === "aberta") return "Aberta";
  if (status === "finalizada") return "Finalizada";
  if (status === "cancelada") return "Cancelada";
  return status;
}

export function rotuloStatusDocumentoFiscal(status: string) {
  if (status === "simulado") return "Simulada";
  if (status === "autorizada") return "Autorizada";
  if (status === "rejeitada") return "Rejeitada";
  if (status === "pendente") return "Pendente";
  if (status === "cancelada") return "Cancelada";
  if (status === "contingencia") return "Contingência";
  return status;
}

const SELECT_DOCUMENTO_FISCAL = {
  status: true,
  mensagem_sefaz: true,
  danfe_url: true,
  numero: true,
} as const;

export async function obterVendaDetalhe(id: number) {
  return prisma.venda.findUnique({
    where: { id },
    include: {
      cliente: { select: { nome: true } },
      usuario: { select: SELECT_USUARIO_RELACAO },
      usuario_venda_cancelada_por_idTousuario: {
        select: SELECT_USUARIO_RELACAO,
      },
      caixa: {
        select: { id: true, status: true, data_fechamento: true },
      },
      nfce: { select: SELECT_DOCUMENTO_FISCAL },
      nfe: { select: SELECT_DOCUMENTO_FISCAL },
      venda_item: {
        include: {
          produto: { select: { nome: true, vendido_por_peso: true } },
        },
        orderBy: { id: "asc" },
      },
      venda_pagamento: {
        include: {
          forma_pagamento: { select: { nome: true, tipo: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  });
}

export async function obterDevolucoesEstoqueDaVenda(vendaId: number) {
  return prisma.movimentacao_estoque.findMany({
    where: {
      origem_tipo: "venda",
      origem_id: vendaId,
      tipo: "devolucao_venda",
    },
    include: { produto: { select: { nome: true } } },
    orderBy: { id: "asc" },
  });
}

export function notaFiscalBloqueiaCancelamento(status?: string | null) {
  return status === "autorizada" || status === "contingencia";
}
