export const NOME_PRODUTO_FRETE = "Frete";
export const TIPO_SERVICO = "servico";

export function ehTipoServico(tipo: string | null | undefined) {
  return tipo === TIPO_SERVICO;
}
