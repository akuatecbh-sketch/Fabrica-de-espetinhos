export function estoqueCritico(
  atual: { toString(): string } | number,
  minimo: { toString(): string } | number | null | undefined,
) {
  const estoqueAtual = Number(atual);
  const estoqueMinimo = Number(minimo ?? 0);
  if (!Number.isFinite(estoqueAtual)) return false;
  if (estoqueAtual <= 0 && estoqueMinimo > 0) return true;
  if (!Number.isFinite(estoqueMinimo) || estoqueMinimo <= 0) return false;
  return estoqueAtual < estoqueMinimo * 0.5;
}
