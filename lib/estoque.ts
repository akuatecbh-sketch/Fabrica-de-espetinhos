import type { Prisma } from "@/generated/prisma/client";
import { arredondarQuantidade } from "@/lib/dinheiro";
import { ehTipoServico } from "@/lib/frete";
import { TIPOS_INSUMO, TIPOS_VENDA } from "@/lib/produto-tipo";

export const ITENS_MOVIMENTACAO_POR_PAGINA = 20;

export const ABAS_ESTOQUE = [
  "geral",
  "movimentacoes",
  "ajuste",
  "producao",
] as const;
export type AbaModuloEstoque = (typeof ABAS_ESTOQUE)[number];

export function abaEstoqueDaUrl(valor?: string): AbaModuloEstoque {
  if (valor === "movimentacoes") return "movimentacoes";
  if (valor === "ajuste") return "ajuste";
  if (valor === "producao") return "producao";
  return "geral";
}

export const TIPOS_MOVIMENTACAO = [
  "entrada_compra",
  "saida_venda",
  "ajuste_positivo",
  "ajuste_negativo",
  "producao_consumo",
  "producao_geracao",
  "perda",
] as const;
export type TipoMovimentacao = (typeof TIPOS_MOVIMENTACAO)[number];

export const TIPOS_AJUSTE = [
  "ajuste_positivo",
  "ajuste_negativo",
  "perda",
] as const;
export type TipoAjuste = (typeof TIPOS_AJUSTE)[number];

export function ehTipoMovimentacao(valor: string): valor is TipoMovimentacao {
  return (TIPOS_MOVIMENTACAO as readonly string[]).includes(valor);
}

export function ehTipoAjuste(valor: string): valor is TipoAjuste {
  return (TIPOS_AJUSTE as readonly string[]).includes(valor);
}

export function rotuloTipoMovimentacao(tipo: string) {
  const mapa: Record<string, string> = {
    entrada_compra: "Entrada de compra",
    saida_venda: "Saída de venda",
    ajuste_positivo: "Ajuste positivo",
    ajuste_negativo: "Ajuste negativo",
    producao_consumo: "Consumo de produção",
    producao_geracao: "Geração de produção",
    perda: "Perda",
  };
  return mapa[tipo] ?? tipo;
}

export function paginaDaUrl(valor?: string) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function limitesDoDiaIso(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const inicio = new Date(ano, mes - 1, dia);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);
  return { inicio, fim };
}

export function ehInsumoOuEmbalagem(tipo: string) {
  return (TIPOS_INSUMO as readonly string[]).includes(tipo);
}

export function ehProdutoVenda(tipo: string) {
  return (TIPOS_VENDA as readonly string[]).includes(tipo);
}

export const FILTROS_VISAO_ESTOQUE = [
  "todos",
  "minimo",
  "ideal",
  "excesso",
] as const;
export type FiltroVisaoEstoque = (typeof FILTROS_VISAO_ESTOQUE)[number];

export type ProdutoNiveisEstoque = {
  tipo: string;
  estoque_atual: number;
  estoque_minimo: number;
  estoque_ideal: number | null;
  estoque_maximo: number | null;
};

export function produtoNoFiltroVisao(
  produto: ProdutoNiveisEstoque,
  filtro: FiltroVisaoEstoque,
) {
  const atual = Number(produto.estoque_atual);
  const minimo = Number(produto.estoque_minimo ?? 0);
  const ideal =
    produto.estoque_ideal != null ? Number(produto.estoque_ideal) : null;
  const maximo =
    produto.estoque_maximo != null ? Number(produto.estoque_maximo) : null;

  if (filtro === "minimo") {
    return ehInsumoOuEmbalagem(produto.tipo) && atual < minimo;
  }
  if (filtro === "ideal") {
    return ehProdutoVenda(produto.tipo) && ideal != null && atual < ideal;
  }
  if (filtro === "excesso") {
    return maximo != null && atual >= maximo;
  }
  return true;
}

export function contagensVisaoEstoque(produtos: ProdutoNiveisEstoque[]) {
  return {
    todos: produtos.length,
    minimo: produtos.filter((produto) => produtoNoFiltroVisao(produto, "minimo"))
      .length,
    ideal: produtos.filter((produto) => produtoNoFiltroVisao(produto, "ideal"))
      .length,
    excesso: produtos.filter((produto) =>
      produtoNoFiltroVisao(produto, "excesso"),
    ).length,
  };
}

export type InsumoFicha = {
  nome: string;
  unidade: string;
  estoque: number;
  quantidadeFicha: number;
};

export type ResultadoProducao =
  | { tipo: "sem_ficha"; sugerida: number }
  | { tipo: "ok"; sugerida: number }
  | {
      tipo: "limitada";
      sugerida: number;
      produzivel: number;
      faltas: { nome: string; unidade: string; falta: number }[];
    };

export function calcularProducao(
  sugerida: number,
  insumos: InsumoFicha[],
): ResultadoProducao {
  const quantidadeSugerida = arredondarQuantidade(Math.max(0, sugerida));
  if (insumos.length === 0) {
    return { tipo: "sem_ficha", sugerida: quantidadeSugerida };
  }

  const faltas: { nome: string; unidade: string; falta: number }[] = [];
  let produzivel = quantidadeSugerida;

  for (const insumo of insumos) {
    const qtdFicha = Number(insumo.quantidadeFicha);
    if (!Number.isFinite(qtdFicha) || qtdFicha <= 0) continue;
    const necessario = arredondarQuantidade(quantidadeSugerida * qtdFicha);
    const estoque = Number(insumo.estoque);
    if (estoque < necessario) {
      faltas.push({
        nome: insumo.nome,
        unidade: insumo.unidade,
        falta: arredondarQuantidade(necessario - estoque),
      });
    }
    const cabem = arredondarQuantidade(estoque / qtdFicha);
    if (cabem < produzivel) produzivel = Math.max(0, cabem);
  }

  if (faltas.length === 0) {
    return { tipo: "ok", sugerida: quantidadeSugerida };
  }
  return {
    tipo: "limitada",
    sugerida: quantidadeSugerida,
    produzivel,
    faltas,
  };
}

export async function baixarEstoqueDaVenda(
  tx: Prisma.TransactionClient,
  params: {
    vendaId: number;
    usuarioId: number;
    itens: {
      produto_id: number;
      quantidade: { toString(): string } | number;
      produto: { tipo: string; controla_estoque: boolean };
    }[];
  },
) {
  for (const item of params.itens) {
    if (!item.produto.controla_estoque) continue;
    if (ehTipoServico(item.produto.tipo)) continue;

    const quantidade = arredondarQuantidade(Number(item.quantidade));
    if (!(quantidade > 0)) continue;

    const produto = await tx.produto.findUniqueOrThrow({
      where: { id: item.produto_id },
      select: { id: true, estoque_atual: true },
    });
    const saldoAnterior = Number(produto.estoque_atual);
    const saldoAtual = arredondarQuantidade(saldoAnterior - quantidade);

    await tx.produto.update({
      where: { id: produto.id },
      data: { estoque_atual: saldoAtual },
    });
    await tx.movimentacao_estoque.create({
      data: {
        produto_id: produto.id,
        tipo: "saida_venda",
        quantidade,
        saldo_anterior: saldoAnterior,
        saldo_atual: saldoAtual,
        origem_tipo: "venda",
        origem_id: params.vendaId,
        usuario_id: params.usuarioId,
        observacao: `Saída da venda #${params.vendaId}`,
      },
    });
  }
}
