import { arredondarDinheiro } from "@/lib/dinheiro";
import { formatarQuantidade } from "@/lib/format";
import { formatarPesoKg } from "@/lib/venda-item";

export const STATUS_INVENTARIO = [
  "em_andamento",
  "finalizado",
  "cancelado",
] as const;
export type StatusInventario = (typeof STATUS_INVENTARIO)[number];

export type SituacaoContagem = "pendente" | "igual" | "sobra" | "falta";

export function situacaoContagem(
  quantidadeContada: number | null,
  diferenca: number | null,
): SituacaoContagem {
  if (quantidadeContada == null || diferenca == null) return "pendente";
  if (diferenca === 0) return "igual";
  return diferenca > 0 ? "sobra" : "falta";
}

export function rotuloSituacaoContagem(situacao: SituacaoContagem) {
  const mapa: Record<SituacaoContagem, string> = {
    pendente: "Pendente",
    igual: "Bateu",
    sobra: "A mais",
    falta: "A menos",
  };
  return mapa[situacao];
}

export function classeBadgeSituacao(situacao: SituacaoContagem) {
  switch (situacao) {
    case "igual":
      return "bg-verde-bg text-verde-texto";
    case "falta":
      return "bg-coral-bg text-coral-texto";
    case "sobra":
      return "bg-ambar-bg text-ambar-texto";
    default:
      return "bg-zinc-100 text-zinc-600";
  }
}

export function rotuloStatusInventario(status: string) {
  if (status === "em_andamento") return "Em andamento";
  if (status === "finalizado") return "Finalizado";
  if (status === "cancelado") return "Cancelado";
  return status;
}

export function classeBadgeStatusInventario(status: string) {
  if (status === "finalizado") return "bg-verde-bg text-verde-texto";
  if (status === "cancelado") return "bg-zinc-100 text-zinc-600";
  return "bg-ambar-bg text-ambar-texto";
}

export function impactoEstimado(
  diferenca: number,
  precoCustoMedio: number | null,
) {
  return arredondarDinheiro(diferenca * Number(precoCustoMedio ?? 0));
}

export function formatarQuantidadeInventario(
  valor: { toString(): string } | number | null | undefined,
  vendidoPorPeso: boolean,
) {
  if (valor == null) return "—";
  return vendidoPorPeso
    ? `${formatarPesoKg(valor)} kg`
    : formatarQuantidade(valor);
}
