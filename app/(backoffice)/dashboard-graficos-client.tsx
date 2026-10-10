"use client";

import nextDynamic from "next/dynamic";

const DashboardGraficos = nextDynamic(
  () => import("./dashboard-graficos").then((mod) => mod.DashboardGraficos),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <div className="h-80 animate-pulse rounded-lg border border-borda bg-zinc-100" />
        <div className="h-80 animate-pulse rounded-lg border border-borda bg-zinc-100" />
        <div className="h-80 animate-pulse rounded-lg border border-borda bg-zinc-100" />
      </div>
    ),
  },
);

export function DashboardGraficosClient({
  faturamento7Dias,
  vendasPorForma,
  produtosMaisVendidos,
}: {
  faturamento7Dias: { rotulo: string; bruto: number; liquido: number }[];
  vendasPorForma: { nome: string; valor: number }[];
  produtosMaisVendidos: { nome: string; quantidade: number }[];
}) {
  return (
    <DashboardGraficos
      faturamento7Dias={faturamento7Dias}
      vendasPorForma={vendasPorForma}
      produtosMaisVendidos={produtosMaisVendidos}
    />
  );
}
