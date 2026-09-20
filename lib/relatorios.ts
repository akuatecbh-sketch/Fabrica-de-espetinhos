import { prisma } from "@/lib/prisma";
import { arredondarDinheiro } from "@/lib/dinheiro";
import { dataLocalISO, ehIsoData } from "@/lib/financeiro";
import type { LinhaMargemProduto } from "@/lib/margem";
import { TIPOS_VENDA } from "@/lib/produto-tipo";

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

function custoMedioDefinido(valor: { toString(): string } | null) {
  if (valor == null) return null;
  const numero = Number(valor.toString());
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return numero;
}

export async function obterMargemPorProduto(): Promise<LinhaMargemProduto[]> {
  const produtos = await prisma.produto.findMany({
    where: {
      ativo: true,
      tipo: { in: [...TIPOS_VENDA] },
    },
    select: {
      id: true,
      nome: true,
      tipo: true,
      preco_custo_medio: true,
      preco_venda: true,
    },
  });

  const linhas = produtos.map((produto) => {
    const precoCusto = custoMedioDefinido(produto.preco_custo_medio);
    const precoVenda =
      produto.preco_venda == null ? null : Number(produto.preco_venda);
    const vendaValida =
      precoVenda != null && Number.isFinite(precoVenda) && precoVenda > 0;
    const margemReais =
      precoCusto != null && vendaValida
        ? arredondarDinheiro(precoVenda - precoCusto)
        : null;
    const margemPct =
      precoCusto != null && vendaValida
        ? ((precoVenda - precoCusto) / precoVenda) * 100
        : null;

    return {
      id: produto.id,
      nome: produto.nome,
      tipo: produto.tipo,
      precoCusto,
      precoVenda: vendaValida ? precoVenda : null,
      margemReais,
      margemPct,
    };
  });

  return linhas.sort((a, b) => {
    if (a.margemPct == null && b.margemPct == null) {
      return a.nome.localeCompare(b.nome, "pt-BR");
    }
    if (a.margemPct == null) return 1;
    if (b.margemPct == null) return -1;
    if (a.margemPct !== b.margemPct) return a.margemPct - b.margemPct;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}
