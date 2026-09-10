export const STATUS_PEDIDO = [
  "aberto",
  "enviado",
  "aprovado",
  "convertido",
  "cancelado",
] as const;

export type StatusPedido = (typeof STATUS_PEDIDO)[number];

export const STATUS_SITUACAO_MANUAL = ["aberto", "enviado", "aprovado"] as const;

export type StatusSituacaoManual = (typeof STATUS_SITUACAO_MANUAL)[number];

export function ehStatusPedido(valor: string): valor is StatusPedido {
  return (STATUS_PEDIDO as readonly string[]).includes(valor);
}

export function ehSituacaoManual(valor: string): valor is StatusSituacaoManual {
  return (STATUS_SITUACAO_MANUAL as readonly string[]).includes(valor);
}

export function pedidoEditavel(status: string) {
  return ehSituacaoManual(status);
}

export function rotuloStatusPedido(status: string) {
  const mapa: Record<string, string> = {
    aberto: "Aberto",
    enviado: "Enviado",
    aprovado: "Aprovado",
    convertido: "Convertido em venda",
    cancelado: "Cancelado",
  };
  return mapa[status] ?? status;
}

export function classesStatusPedido(status: string) {
  if (status === "aprovado") {
    return "rounded bg-verde-sucesso/10 px-2 py-0.5 text-xs font-medium text-verde-sucesso";
  }
  if (status === "convertido") {
    return "rounded bg-azul-bg px-2 py-0.5 text-xs font-medium text-azul-texto";
  }
  if (status === "cancelado") {
    return "rounded bg-vermelho-erro/10 px-2 py-0.5 text-xs font-medium text-vermelho-erro";
  }
  if (status === "enviado") {
    return "rounded bg-ambar/10 px-2 py-0.5 text-xs font-medium text-ambar";
  }
  return "rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700";
}
