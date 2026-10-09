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

export const PEDIDOS_POR_PAGINA = 20;

export function pedidoEditavel(status: string) {
  return ehSituacaoManual(status);
}

export function numeroPedidoDaBusca(busca: string): number | null {
  const limpo = busca.trim();
  if (!/^\d+$/.test(limpo)) return null;
  const n = Number(limpo);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function precisaAvisarEdicaoAposEnvio(status: string) {
  return status === "enviado" || status === "aprovado";
}

export function statusAposEditarPedido(status: string) {
  return status === "aprovado" ? "enviado" : status;
}

export function motivoEditarIndisponivel(status: string): string | null {
  if (pedidoEditavel(status)) return null;
  if (status === "convertido") {
    return "Pedido já convertido em venda e não pode ser editado.";
  }
  if (status === "cancelado") {
    return "Pedido cancelado não pode ser editado.";
  }
  return "Este pedido não pode ser editado.";
}

export function motivoCancelarIndisponivel(
  status: string,
  temPermissao: boolean,
): string | null {
  if (!temPermissao) {
    return "Sem permissão para cancelar pedido.";
  }
  if (status === "convertido") {
    return "Pedido já virou venda. Cancele a venda, se necessário.";
  }
  if (status === "cancelado") {
    return "Pedido já está cancelado.";
  }
  if (!pedidoEditavel(status)) {
    return "Este pedido não pode ser cancelado.";
  }
  return null;
}

export function podeConfirmarEntregaPedido(status: string) {
  return status === "aprovado" || status === "convertido";
}

export function motivoConfirmarEntregaIndisponivel(
  status: string,
  jaEntregue: boolean,
): string | null {
  if (jaEntregue) return "Entrega já registrada.";
  if (status === "cancelado") {
    return "Pedido cancelado não pode ter entrega confirmada.";
  }
  if (status === "aberto" || status === "enviado") {
    return "Confirme a entrega só depois que o pedido for aprovado ou convertido.";
  }
  if (!podeConfirmarEntregaPedido(status)) {
    return "Não é possível confirmar a entrega deste pedido.";
  }
  return null;
}

export function hrefListaPedidos(params: {
  q?: string;
  status?: string;
  filtro?: string;
  pagina?: number;
}) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.status && params.status !== "todos") {
    sp.set("status", params.status);
  } else if (params.filtro && ehStatusPedido(params.filtro)) {
    sp.set("filtro", params.filtro);
  }
  if (params.pagina && params.pagina > 1) {
    sp.set("pagina", String(params.pagina));
  }
  const qs = sp.toString();
  return qs ? `/pedidos?${qs}` : "/pedidos";
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
