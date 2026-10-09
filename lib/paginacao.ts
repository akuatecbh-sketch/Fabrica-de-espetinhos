export function paginaDaUrl(valor?: string) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
