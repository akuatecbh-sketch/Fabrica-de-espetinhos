import { formatarPreco, formatarQuantidade } from "@/lib/format";

export type ItemVendaExibicao = {
  vendido_em_pacote: boolean;
  quantidade_pacotes: number | null;
  quantidade: { toString(): string };
  preco_unitario: { toString(): string };
  subtotal: { toString(): string };
};

export function rotuloQuantidadeItem(item: ItemVendaExibicao) {
  if (item.vendido_em_pacote && item.quantidade_pacotes != null) {
    const pacotes = formatarQuantidade(item.quantidade_pacotes);
    const unidades = formatarQuantidade(item.quantidade);
    const rotulo = item.quantidade_pacotes === 1 ? "pacote" : "pacotes";
    return `${pacotes} ${rotulo} (${unidades} un)`;
  }
  return formatarQuantidade(item.quantidade);
}

export function detalheItemVenda(item: ItemVendaExibicao) {
  if (item.vendido_em_pacote && item.quantidade_pacotes != null) {
    return `${rotuloQuantidadeItem(item)} — ${formatarPreco(item.subtotal)}`;
  }
  return `${formatarQuantidade(item.quantidade)} un × ${formatarPreco(item.preco_unitario)}`;
}

export function linhaItemVenda(nome: string, item: ItemVendaExibicao) {
  return `${nome} — ${detalheItemVenda(item)}`;
}
