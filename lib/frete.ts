export const NOME_PRODUTO_FRETE = "Frete";
export const TIPO_SERVICO = "servico";

export function ehTipoServico(tipo: string | null | undefined) {
  return tipo === TIPO_SERVICO;
}

export function itensComFreteNoFinal<T extends { produto: { tipo: string } }>(
  itens: T[],
) {
  const normais: T[] = [];
  const servicos: T[] = [];
  for (const item of itens) {
    if (ehTipoServico(item.produto.tipo)) servicos.push(item);
    else normais.push(item);
  }
  return [...normais, ...servicos];
}
