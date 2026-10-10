export const LISTA_POR_PAGINA = 20;
export const VENDAS_LISTA_LIMITE = 200;

export function paginaDaUrl(valor?: string) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
