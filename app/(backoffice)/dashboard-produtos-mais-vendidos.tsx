"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarQuantidade } from "@/lib/format";

export type PontoProdutoMaisVendido = {
  nome: string;
  quantidade: number;
};

export function GraficoProdutosMaisVendidos({
  itens,
}: {
  itens: PontoProdutoMaisVendido[];
}) {
  if (itens.length === 0) {
    return (
      <div className="flex h-full min-h-56 items-center justify-center">
        <p className="text-sm text-texto-secundario">
          Sem vendas suficientes no período
        </p>
      </div>
    );
  }

  const barras = [...itens].reverse();

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        layout="vertical"
        data={barras}
        margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          type="number"
          tick={{ fill: "#6b7280", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="nome"
          width={120}
          tick={{ fill: "#6b7280", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(valor) => formatarQuantidade(Number(valor ?? 0))}
        />
        <Bar
          dataKey="quantidade"
          name="Quantidade"
          fill="#16A34A"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
