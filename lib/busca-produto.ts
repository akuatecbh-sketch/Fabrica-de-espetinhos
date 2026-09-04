export const MINIMO_BUSCA = 2;

export function filtroBuscaProduto(
  termo: string,
  tipos: readonly string[],
) {
  const q = termo.trim();
  if (q.length < MINIMO_BUSCA) return null;

  return {
    ativo: true as const,
    tipo: { in: [...tipos] },
    OR: [
      { nome: { contains: q, mode: "insensitive" as const } },
      { codigo: { contains: q, mode: "insensitive" as const } },
      { codigo_barras: { contains: q, mode: "insensitive" as const } },
    ],
  };
}
