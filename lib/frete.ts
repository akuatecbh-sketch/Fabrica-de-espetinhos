export const NOME_PRODUTO_FRETE = "Frete";
export const TIPO_SERVICO = "servico";

export function ehTipoServico(tipo: string | null | undefined) {
  return tipo === TIPO_SERVICO;
}

export function separarItensEFrete<T extends { produto: { tipo: string } }>(
  itens: T[],
) {
  const itensNormais: T[] = [];
  const servicos: T[] = [];
  for (const item of itens) {
    if (ehTipoServico(item.produto.tipo)) servicos.push(item);
    else itensNormais.push(item);
  }
  return {
    itensNormais,
    itemFrete: servicos[0] ?? null,
  };
}

export function itensComFreteNoFinal<T extends { produto: { tipo: string } }>(
  itens: T[],
) {
  const { itensNormais, itemFrete } = separarItensEFrete(itens);
  return itemFrete ? [...itensNormais, itemFrete] : itensNormais;
}
