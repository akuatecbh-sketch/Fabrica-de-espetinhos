import { arredondarCusto, arredondarDinheiro } from "@/lib/dinheiro";

export const PRAZO_PAGAMENTO_COMPRA_DIAS = 30;
export const CATEGORIA_COMPRA_INSUMOS = "Compra de Insumos";

export const STATUS_NOTA = ["lancada", "conferida", "cancelada"] as const;
export type StatusNota = (typeof STATUS_NOTA)[number];

export function rotuloStatusNota(status: string) {
  const mapa: Record<string, string> = {
    lancada: "Lançada",
    conferida: "Conferida",
    cancelada: "Cancelada",
  };
  return mapa[status] ?? status;
}

export function classesStatusNota(status: string) {
  if (status === "cancelada") {
    return "rounded bg-vermelho-erro/10 px-2 py-0.5 text-xs font-medium text-vermelho-erro";
  }
  if (status === "conferida") {
    return "rounded bg-verde-sucesso/10 px-2 py-0.5 text-xs font-medium text-verde-sucesso";
  }
  return "rounded bg-ambar/10 px-2 py-0.5 text-xs font-medium text-ambar";
}

export function totaisDaNota(
  itens: { quantidade: number; valor_unitario: number }[],
  frete: number,
  desconto: number,
) {
  const valor_produtos = arredondarDinheiro(
    itens.reduce(
      (acc, item) => acc + item.quantidade * item.valor_unitario,
      0,
    ),
  );
  const valor_frete = arredondarDinheiro(Math.max(0, frete));
  const valor_desconto = arredondarDinheiro(Math.max(0, desconto));
  const valor_total = arredondarDinheiro(
    valor_produtos + valor_frete - valor_desconto,
  );
  return { valor_produtos, valor_frete, valor_desconto, valor_total };
}

export function calcularCustoMedio(
  estoqueAnterior: number,
  custoAnterior: number,
  quantidade: number,
  unitario: number,
) {
  const denominador = estoqueAnterior + quantidade;
  if (estoqueAnterior === 0 || denominador === 0) {
    return arredondarCusto(unitario);
  }
  return arredondarCusto(
    (estoqueAnterior * custoAnterior + quantidade * unitario) / denominador,
  );
}

export function dataVencimentoPadraoCompra(dataEmissao: Date) {
  const vencimento = new Date(dataEmissao);
  vencimento.setUTCDate(
    vencimento.getUTCDate() + PRAZO_PAGAMENTO_COMPRA_DIAS,
  );
  return vencimento;
}
