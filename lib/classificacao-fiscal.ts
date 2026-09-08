export const ORIGENS_MERCADORIA = [
  { valor: "0", rotulo: "0 — Nacional" },
  { valor: "1", rotulo: "1 — Estrangeira (importação direta)" },
  { valor: "2", rotulo: "2 — Estrangeira (mercado interno)" },
  { valor: "3", rotulo: "3 — Nacional (conteúdo de importação 40% a 70%)" },
  { valor: "4", rotulo: "4 — Nacional (processo produtivo básico)" },
  { valor: "5", rotulo: "5 — Nacional (conteúdo de importação até 40%)" },
  { valor: "6", rotulo: "6 — Estrangeira (importação direta, sem similar nacional)" },
  { valor: "7", rotulo: "7 — Estrangeira (mercado interno, sem similar nacional)" },
  { valor: "8", rotulo: "8 — Nacional (conteúdo de importação acima de 70%)" },
] as const;

export function produtoSemDadosFiscais(produto: { ncm?: string | null }) {
  return !produto.ncm?.trim();
}
