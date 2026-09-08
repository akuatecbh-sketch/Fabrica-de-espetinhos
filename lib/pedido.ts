export const STATUS_PEDIDO = [
  "aberto",
  "enviado",
  "convertido",
  "cancelado",
] as const;

export type StatusPedido = (typeof STATUS_PEDIDO)[number];

export function ehStatusPedido(valor: string): valor is StatusPedido {
  return (STATUS_PEDIDO as readonly string[]).includes(valor);
}

export function pedidoEditavel(status: string) {
  return status === "aberto" || status === "enviado";
}

export function rotuloStatusPedido(status: string) {
  const mapa: Record<string, string> = {
    aberto: "Aberto",
    enviado: "Enviado",
    convertido: "Convertido",
    cancelado: "Cancelado",
  };
  return mapa[status] ?? status;
}

export function classesStatusPedido(status: string) {
  if (status === "convertido") {
    return "rounded bg-verde-sucesso/10 px-2 py-0.5 text-xs font-medium text-verde-sucesso";
  }
  if (status === "cancelado") {
    return "rounded bg-vermelho-erro/10 px-2 py-0.5 text-xs font-medium text-vermelho-erro";
  }
  if (status === "enviado") {
    return "rounded bg-ambar/10 px-2 py-0.5 text-xs font-medium text-ambar";
  }
  return "rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700";
}
