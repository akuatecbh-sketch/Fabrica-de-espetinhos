export const TIPOS_CUPOM = ["fiscal", "nao_fiscal", "nenhum", "nfe"] as const;

export type TipoCupom = (typeof TIPOS_CUPOM)[number];

export function ehTipoCupom(valor: string): valor is TipoCupom {
  return (TIPOS_CUPOM as readonly string[]).includes(valor);
}
