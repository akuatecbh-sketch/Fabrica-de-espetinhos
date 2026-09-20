import { prisma } from "@/lib/prisma";
import { dataLocalISO, ehIsoData } from "@/lib/financeiro";

export const LIMITE_PRODUTOS_MAIS_VENDIDOS = 20;

export function periodoPadraoRelatorio(hoje = new Date()) {
  const ate = dataLocalISO(hoje);
  const inicio = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate() - 29,
  );
  return { de: dataLocalISO(inicio), ate };
}

export function periodoDaUrl(de?: string, ate?: string) {
  const padrao = periodoPadraoRelatorio();
  const inicio = de && ehIsoData(de) ? de : padrao.de;
  const fim = ate && ehIsoData(ate) ? ate : padrao.ate;
  if (inicio > fim) return { de: fim, ate: inicio };
  return { de: inicio, ate: fim };
}

export function limitesDoPeriodoLocal(de: string, ate: string) {
  const [anoInicio, mesInicio, diaInicio] = de.split("-").map(Number);
  const [anoFim, mesFim, diaFim] = ate.split("-").map(Number);
  const inicio = new Date(anoInicio, mesInicio - 1, diaInicio);
  const fim = new Date(anoFim, mesFim - 1, diaFim);
  fim.setDate(fim.getDate() + 1);
  return { inicio, fim };
}

export type ProdutoMaisVendido = {
  produtoId: number;
  nome: string;
  vendidoPorPeso: boolean;
  quantidade: number;
  valorTotal: number;
};

export async function obterProdutosMaisVendidos(params: {
  de: string;
  ate: string;
  todos?: boolean;
}): Promise<{ itens: ProdutoMaisVendido[]; temMais: boolean }> {
  const { inicio, fim } = limitesDoPeriodoLocal(params.de, params.ate);
  const limite = params.todos ? undefined : LIMITE_PRODUTOS_MAIS_VENDIDOS + 1;

  const agrupados = await prisma.venda_item.groupBy({
    by: ["produto_id"],
    where: {
      venda: {
        status: "finalizada",
        finalizado_em: { gte: inicio, lt: fim },
      },
    },
    _sum: {
      quantidade: true,
      subtotal: true,
    },
    orderBy: {
      _sum: {
        quantidade: "desc",
      },
    },
    take: limite,
  });

  const temMais =
    !params.todos && agrupados.length > LIMITE_PRODUTOS_MAIS_VENDIDOS;
  const fatia = temMais
    ? agrupados.slice(0, LIMITE_PRODUTOS_MAIS_VENDIDOS)
    : agrupados;

  const produtos = await prisma.produto.findMany({
    where: { id: { in: fatia.map((linha) => linha.produto_id) } },
    select: { id: true, nome: true, vendido_por_peso: true },
  });
  const porId = new Map(produtos.map((produto) => [produto.id, produto]));

  return {
    temMais,
    itens: fatia.map((linha) => {
      const produto = porId.get(linha.produto_id);
      return {
        produtoId: linha.produto_id,
        nome: produto?.nome ?? `Produto #${linha.produto_id}`,
        vendidoPorPeso: Boolean(produto?.vendido_por_peso),
        quantidade: Number(linha._sum.quantidade ?? 0),
        valorTotal: Number(linha._sum.subtotal ?? 0),
      };
    }),
  };
}
