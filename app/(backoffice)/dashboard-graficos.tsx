"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarPreco } from "@/lib/format";

type PontoFaturamentoDia = {
  rotulo: string;
  bruto: number;
  liquido: number;
};

type PontoFormaPagamento = {
  nome: string;
  valor: number;
};

const CORES_FORMA: Record<string, string> = {
  dinheiro: "#F59E0B",
  pix: "#16A34A",
  débito: "#3B82F6",
  debito: "#3B82F6",
  crédito: "#7C3AED",
  credito: "#7C3AED",
};

const CORES_EXTRA = ["#0D9488", "#E11D48", "#6366F1", "#64748B"];

function corForma(nome: string, indice: number) {
  const chave = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  for (const [trecho, cor] of Object.entries(CORES_FORMA)) {
    if (chave.includes(trecho)) return cor;
  }
  return CORES_EXTRA[indice % CORES_EXTRA.length];
}

function Painel({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-[22rem] flex-col rounded-xl border border-borda bg-superficie p-4 shadow-[0_4px_14px_rgb(15_23_42_/_0.06)]">
      <h2 className="text-base font-semibold text-texto-primario">{titulo}</h2>
      <div className="mt-4 min-h-0 flex-1">{children}</div>
    </section>
  );
}

function SemDados({ texto }: { texto: string }) {
  return (
    <div className="flex h-full min-h-56 items-center justify-center">
      <p className="text-sm text-texto-secundario">{texto}</p>
    </div>
  );
}

export function DashboardGraficos({
  faturamento7Dias,
  vendasPorForma,
}: {
  faturamento7Dias: PontoFaturamentoDia[];
  vendasPorForma: PontoFormaPagamento[];
}) {
  const temFaturamento = faturamento7Dias.some(
    (ponto) => ponto.bruto > 0 || ponto.liquido > 0,
  );
  const totalFormas = vendasPorForma.reduce((soma, ponto) => soma + ponto.valor, 0);
  const formasComPercentual = vendasPorForma.map((ponto) => ({
    ...ponto,
    percentual:
      totalFormas > 0 ? Math.round((ponto.valor / totalFormas) * 100) : 0,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Painel titulo="Faturamento dos últimos 7 dias">
        {temFaturamento ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={faturamento7Dias} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="rotulo"
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
              <Tooltip formatter={(valor) => formatarPreco(Number(valor ?? 0))} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="bruto" name="Bruto" fill="#16A34A" radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="liquido"
                name="Líquido"
                fill="#3B82F6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <SemDados texto="Sem vendas nos últimos 7 dias." />
        )}
      </Painel>

      <Painel titulo="Vendas por forma de pagamento">
        {totalFormas > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={formasComPercentual}
                dataKey="valor"
                nameKey="nome"
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={2}
              >
                {formasComPercentual.map((entrada, indice) => (
                  <Cell
                    key={entrada.nome}
                    fill={corForma(entrada.nome, indice)}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(valor) => formatarPreco(Number(valor ?? 0))} />
              <Legend
                formatter={(valor: string) => {
                  const ponto = formasComPercentual.find((item) => item.nome === valor);
                  return `${valor} (${ponto?.percentual ?? 0}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <SemDados texto="Sem vendas nos últimos 30 dias." />
        )}
      </Painel>
    </div>
  );
}
