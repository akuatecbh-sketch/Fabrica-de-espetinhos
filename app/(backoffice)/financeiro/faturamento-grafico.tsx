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
import { formatarPreco } from "@/lib/format";
import type { PontoFaturamentoDia } from "@/lib/faturamento";

export function FaturamentoGrafico({
  pontos,
}: {
  pontos: PontoFaturamentoDia[];
}) {
  const temDados = pontos.some((ponto) => ponto.liquido > 0);

  if (!temDados) {
    return (
      <p className="py-10 text-center text-sm text-texto-secundario">
        Sem faturamento líquido neste mês.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={pontos} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="rotulo"
          interval={4}
          tick={{ fill: "#6b7280", fontSize: 12 }}
          axisLine={{ stroke: "#e5e7eb" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(valor: number) =>
            new Intl.NumberFormat("pt-BR", {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(valor)
          }
        />
        <Tooltip
          formatter={(valor) => formatarPreco(Number(valor ?? 0))}
          labelFormatter={(dia) => `Dia ${dia}`}
        />
        <Bar
          dataKey="liquido"
          name="Líquido"
          fill="#3B82F6"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
