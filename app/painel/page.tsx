import { ShoppingBag, Store, Wallet } from "lucide-react";
import { GraficoFaturamento7Dias } from "@/app/(backoffice)/dashboard-graficos";
import { obterDadosPainelTv } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";
import { ContagemValor } from "@/app/(backoffice)/contagem-valor";
import { AtualizarPainel } from "./atualizar";
import { RelogioPainel } from "./relogio";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function CardKpi({
  fundo,
  pulso,
  icone: Icone,
  valor,
  rotulo,
  tipo = "moeda",
  destaque = false,
}: {
  fundo: string;
  pulso?: string;
  icone: typeof Store;
  valor: number;
  rotulo: string;
  tipo?: "moeda" | "inteiro";
  destaque?: boolean;
}) {
  return (
    <article
      className={`flex h-full flex-col justify-between rounded-2xl p-6 text-white shadow-[0_8px_24px_rgb(0_0_0_/_0.35)] ${fundo} ${pulso ?? ""}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
        <Icone className="h-6 w-6 text-white" aria-hidden />
      </span>
      <div className="mt-6">
        <ContagemValor
          valor={valor}
          tipo={tipo}
          className={
            destaque
              ? "text-5xl font-bold leading-none text-white xl:text-6xl"
              : "text-4xl font-bold leading-none text-white xl:text-5xl"
          }
        />
        <p className="mt-3 text-lg font-medium text-white/90 xl:text-xl">
          {rotulo}
        </p>
      </div>
    </article>
  );
}

export default async function PainelPage() {
  const [dados, empresa] = await Promise.all([
    obterDadosPainelTv(),
    prisma.empresa.findUnique({
      where: { id: 1 },
      select: { nome_fantasia: true, razao_social: true },
    }),
  ]);

  const nomeLoja =
    empresa?.nome_fantasia?.trim() ||
    empresa?.razao_social?.trim() ||
    "Fábrica de Espetinhos";
  const dataHoje = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <main className="flex min-h-screen flex-col gap-8 px-8 py-6 xl:px-12 xl:py-8">
      <AtualizarPainel />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
            Painel do dia
          </p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight xl:text-5xl">
            {nomeLoja}
          </h1>
          <p className="mt-2 text-xl capitalize text-slate-300">{dataHoje}</p>
        </div>
        <p className="text-4xl font-semibold text-white xl:text-5xl">
          <RelogioPainel />
        </p>
      </header>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <CardKpi
          fundo="bg-[#16A34A]"
          pulso={dados.vendasHoje.faturamentoBruto > 0 ? "pulso-kpi-verde" : ""}
          icone={Store}
          valor={dados.vendasHoje.faturamentoBruto}
          rotulo="Faturamento bruto de hoje"
          destaque
        />
        <CardKpi
          fundo="bg-[#3B82F6]"
          pulso={dados.vendasHoje.faturamentoLiquido > 0 ? "pulso-kpi-azul" : ""}
          icone={Wallet}
          valor={dados.vendasHoje.faturamentoLiquido}
          rotulo="Faturamento líquido de hoje"
          destaque
        />
        <CardKpi
          fundo="bg-[#D97706]"
          pulso={dados.vendasHoje.quantidade > 0 ? "pulso-kpi-laranja" : ""}
          icone={ShoppingBag}
          valor={dados.vendasHoje.quantidade}
          tipo="inteiro"
          rotulo={
            dados.vendasHoje.quantidade === 1
              ? "Venda hoje"
              : "Vendas hoje"
          }
        />
      </section>

      <section className="flex min-h-[22rem] flex-1 flex-col rounded-2xl border border-white/10 bg-[#111827] p-6">
        <h2 className="text-2xl font-semibold text-white">
          Faturamento dos últimos 7 dias
        </h2>
        <div className="mt-4 min-h-0 flex-1">
          <GraficoFaturamento7Dias
            faturamento7Dias={dados.faturamento7Dias}
            tema="tv"
            altura={420}
          />
        </div>
      </section>
    </main>
  );
}
