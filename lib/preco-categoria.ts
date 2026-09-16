import {
  CATEGORIA_PRECO_PADRAO,
  ehCategoriaPreco,
  rotuloCategoriaPreco,
  type CategoriaPreco,
} from "@/lib/cliente";

type ValorDecimal = { toString(): string } | string | null | undefined;

export type ProdutoPrecosCategoria = {
  preco_venda?: ValorDecimal;
  preco_atacado?: ValorDecimal;
  preco_repasse?: ValorDecimal;
};

function numeroOpcional(valor: ValorDecimal): number | null {
  if (valor == null || valor === "") return null;
  const numero = Number(valor.toString().replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

export function normalizarCategoriaPreco(
  valor: string | null | undefined,
): CategoriaPreco {
  return valor && ehCategoriaPreco(valor) ? valor : CATEGORIA_PRECO_PADRAO;
}

export function resolverPrecoCategoria(
  produto: ProdutoPrecosCategoria,
  tipo: string | null | undefined,
): { preco: number | null; tipoAplicado: CategoriaPreco } {
  const categoria = normalizarCategoriaPreco(tipo);
  const varejo = numeroOpcional(produto.preco_venda);
  let preco = varejo;
  if (categoria === "atacado") {
    preco = numeroOpcional(produto.preco_atacado) ?? varejo;
  } else if (categoria === "repasse") {
    preco = numeroOpcional(produto.preco_repasse) ?? varejo;
  }
  return { preco, tipoAplicado: categoria };
}

export function textoCategoriaPrecoImpressao(
  tipoPreco: string | null | undefined,
  itens: { tipo_preco_aplicado?: string | null }[] = [],
) {
  const usados = new Set<string>();
  const header = normalizarCategoriaPreco(tipoPreco);
  if (header !== "varejo") usados.add(header);
  for (const item of itens) {
    const aplicado = normalizarCategoriaPreco(item.tipo_preco_aplicado);
    if (aplicado !== "varejo") usados.add(aplicado);
  }
  if (usados.size === 0) return null;
  const rotulos = [...usados].map((valor) => rotuloCategoriaPreco(valor));
  return `Categoria de preço: ${rotulos.join(", ")}`;
}
