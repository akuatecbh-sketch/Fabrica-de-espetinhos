import { formatarPreco, formatarQuantidade } from "@/lib/format";

export type ItemVendaExibicao = {
  vendido_em_pacote: boolean;
  vendido_por_peso?: boolean;
  quantidade_pacotes: number | null;
  quantidade: { toString(): string } | number;
  preco_unitario: { toString(): string } | number;
  subtotal: { toString(): string } | number;
};

export function itemVendidoPorPeso(item: ItemVendaExibicao) {
  return Boolean(item.vendido_por_peso);
}

export function comFlagPeso<
  T extends {
    vendido_em_pacote: boolean;
    vendido_por_peso?: boolean;
    quantidade_pacotes: number | null;
    quantidade: { toString(): string } | number;
    preco_unitario: { toString(): string } | number;
    subtotal: { toString(): string } | number;
    produto?: { vendido_por_peso?: boolean } | null;
  },
>(item: T): ItemVendaExibicao {
  return {
    vendido_em_pacote: item.vendido_em_pacote,
    vendido_por_peso: Boolean(
      item.vendido_por_peso ?? item.produto?.vendido_por_peso,
    ),
    quantidade_pacotes: item.quantidade_pacotes,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
    subtotal: item.subtotal,
  };
}

export function itemUsaLinhaCompleta(item: ItemVendaExibicao) {
  return item.vendido_em_pacote || itemVendidoPorPeso(item);
}

export function formatarPesoKg(valor: { toString(): string } | number) {
  const numero = Number(valor.toString());
  if (!Number.isFinite(numero)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(numero);
}

export function rotuloQuantidadeItem(item: ItemVendaExibicao) {
  if (itemVendidoPorPeso(item)) {
    return `${formatarPesoKg(item.quantidade)} kg`;
  }
  if (item.vendido_em_pacote && item.quantidade_pacotes != null) {
    const pacotes = formatarQuantidade(item.quantidade_pacotes);
    const unidades = formatarQuantidade(item.quantidade);
    const rotulo = item.quantidade_pacotes === 1 ? "pacote" : "pacotes";
    return `${pacotes} ${rotulo} (${unidades} un)`;
  }
  return formatarQuantidade(item.quantidade);
}

export function rotuloPrecoUnitarioItem(item: ItemVendaExibicao) {
  if (item.vendido_em_pacote) return "—";
  if (itemVendidoPorPeso(item)) {
    return `${formatarPreco(item.preco_unitario)}/kg`;
  }
  return formatarPreco(item.preco_unitario);
}

export function detalheItemVenda(item: ItemVendaExibicao) {
  if (itemVendidoPorPeso(item)) {
    return `${formatarPesoKg(item.quantidade)} kg × ${formatarPreco(item.preco_unitario)}/kg = ${formatarPreco(item.subtotal)}`;
  }
  if (item.vendido_em_pacote && item.quantidade_pacotes != null) {
    return `${rotuloQuantidadeItem(item)} — ${formatarPreco(item.subtotal)}`;
  }
  return `${formatarQuantidade(item.quantidade)} un × ${formatarPreco(item.preco_unitario)}`;
}

export function linhaItemVenda(nome: string, item: ItemVendaExibicao) {
  return `${nome} — ${detalheItemVenda(item)}`;
}

export function descricaoFiscalItem(nome: string, item: ItemVendaExibicao) {
  if (itemVendidoPorPeso(item)) {
    return `${nome} — ${formatarPesoKg(item.quantidade)} kg × ${formatarPreco(item.preco_unitario)}/kg`;
  }
  return nome;
}
