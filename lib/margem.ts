export const LIMIAR_MARGEM_PADRAO = 20;

export type TipoFiltroMargem = "todos" | "produto_final" | "revenda";

export type LinhaMargemProduto = {
  id: number;
  nome: string;
  tipo: string;
  precoCusto: number | null;
  precoVenda: number | null;
  margemReais: number | null;
  margemPct: number | null;
};

export function formatarPercentualMargem(valor: number) {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(valor)}%`;
}
