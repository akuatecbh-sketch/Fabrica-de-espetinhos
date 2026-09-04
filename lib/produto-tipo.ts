export const TIPOS_CATEGORIA = [
  "insumo",
  "produto_final",
  "embalagem",
  "revenda",
] as const;

export type TipoCategoria = (typeof TIPOS_CATEGORIA)[number];

export function ehTipoCategoria(valor: string): valor is TipoCategoria {
  return (TIPOS_CATEGORIA as readonly string[]).includes(valor);
}

export const TIPOS_VENDA = ["produto_final", "revenda"] as const;
export const TIPOS_INSUMO = ["insumo", "embalagem"] as const;

export type AbaEstoque = "vendas" | "insumos";

export function abaPorTipo(tipo: string): AbaEstoque {
  return (TIPOS_INSUMO as readonly string[]).includes(tipo)
    ? "insumos"
    : "vendas";
}

export function tiposDaAba(aba: AbaEstoque) {
  return aba === "insumos" ? [...TIPOS_INSUMO] : [...TIPOS_VENDA];
}

export function abaDaUrl(valor?: string): AbaEstoque {
  return valor === "insumos" ? "insumos" : "vendas";
}
