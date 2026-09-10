import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirAcesso } from "@/lib/permissoes";
import {
  abaFinanceiroDaUrl,
  dataLocalISO,
  dataUtcMeiaNoite,
  ehIsoData,
  ehTipoCategoriaPagar,
  mesFinanceiroDaUrl,
} from "@/lib/financeiro";
import { obterFaturamentoMes } from "@/lib/faturamento";
import { obterResumoDreMes } from "@/lib/resumo-financeiro";
import type { Prisma } from "@/generated/prisma/client";
import { AbasFinanceiro } from "./abas";
import { DespesasResumo } from "./despesas-resumo";
import { FaturamentoPainel } from "./faturamento-painel";
import { FiltrosContas } from "./filtros";
import { ListaPagar } from "./lista-pagar";
import { ListaReceber } from "./lista-receber";
import { ResumoDre } from "./resumo-dre";
import { TaxasPainel } from "./taxas-painel";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    aba?: string;
    status?: string;
    filtro?: string;
    de?: string;
    ate?: string;
    mes?: string;
    tipo?: string;
    nova?: string;
  }>;
};

function filtroPeriodo(de?: string, ate?: string) {
  const periodo: { gte?: Date; lte?: Date } = {};
  if (de && ehIsoData(de)) periodo.gte = dataUtcMeiaNoite(de);
  if (ate && ehIsoData(ate)) periodo.lte = dataUtcMeiaNoite(ate);
  return Object.keys(periodo).length > 0 ? periodo : undefined;
}

function wherePagar(
  status: string,
  hoje: Date,
  periodo?: { gte?: Date; lte?: Date },
  tipo?: string,
): Prisma.conta_pagarWhereInput {
  const base: Prisma.conta_pagarWhereInput = {
    ...(periodo ? { data_vencimento: periodo } : {}),
    ...(tipo && ehTipoCategoriaPagar(tipo)
      ? { categoria_financeira: { tipo } }
      : {}),
  };

  if (status === "todas") return base;
  if (status === "pendentes") {
    return { ...base, status: { in: ["aberta", "atrasada"] } };
  }
  if (status === "paga") return { ...base, status: "paga" };
  if (status === "cancelada") return { ...base, status: "cancelada" };
  if (status === "atrasada") {
    return {
      ...base,
      OR: [
        { status: "atrasada" },
        { status: "aberta", data_vencimento: { lt: hoje } },
      ],
    };
  }
  return { ...base, status: "aberta" };
}

function whereReceber(
  status: string,
  hoje: Date,
  periodo?: { gte?: Date; lte?: Date },
): Prisma.conta_receberWhereInput {
  const base: Prisma.conta_receberWhereInput = periodo
    ? { data_vencimento: periodo }
    : {};

  if (status === "todas") return base;
  if (status === "pendentes") {
    return { ...base, status: { in: ["aberta", "atrasada"] } };
  }
  if (status === "recebida" || status === "paga") {
    return { ...base, status: "recebida" };
  }
  if (status === "cancelada") return { ...base, status: "cancelada" };
  if (status === "atrasada") {
    return {
      ...base,
      OR: [
        { status: "atrasada" },
        { status: "aberta", data_vencimento: { lt: hoje } },
      ],
    };
  }
  return { ...base, status: "aberta" };
}

const FILTRO_ABERTO = { status: { in: ["aberta", "atrasada"] } };

async function AbaDespesas({
  status,
  de,
  ate,
  tipo,
}: {
  status: string;
  de: string;
  ate: string;
  tipo: string;
}) {
  const hoje = dataUtcMeiaNoite(dataLocalISO());
  const periodo = filtroPeriodo(de, ate);
  const [contas, fixas, variaveis] = await Promise.all([
    prisma.conta_pagar.findMany({
      where: wherePagar(status, hoje, periodo, tipo),
      include: {
        fornecedor: true,
        categoria_financeira: true,
      },
      orderBy: [{ data_vencimento: "asc" }, { id: "asc" }],
    }),
    prisma.conta_pagar.aggregate({
      where: {
        ...FILTRO_ABERTO,
        categoria_financeira: { tipo: "custo_fixo" },
      },
      _sum: { valor: true },
      _count: { _all: true },
    }),
    prisma.conta_pagar.aggregate({
      where: {
        ...FILTRO_ABERTO,
        categoria_financeira: { tipo: "custo_variavel" },
      },
      _sum: { valor: true },
      _count: { _all: true },
    }),
  ]);

  return (
    <>
      <DespesasResumo
        fixas={{
          total: Number(fixas._sum.valor ?? 0),
          quantidade: fixas._count._all,
        }}
        variaveis={{
          total: Number(variaveis._sum.valor ?? 0),
          quantidade: variaveis._count._all,
        }}
      />
      <FiltrosContas
        aba="despesas"
        status={status}
        de={de}
        ate={ate}
        tipo={tipo}
      />
      <ListaPagar contas={contas} />
    </>
  );
}

async function AbaReceber({
  status,
  de,
  ate,
}: {
  status: string;
  de: string;
  ate: string;
}) {
  const hoje = dataUtcMeiaNoite(dataLocalISO());
  const periodo = filtroPeriodo(de, ate);
  const contas = await prisma.conta_receber.findMany({
    where: whereReceber(status, hoje, periodo),
    include: { cliente: true },
    orderBy: [{ data_vencimento: "asc" }, { id: "asc" }],
  });

  return (
    <>
      <FiltrosContas aba="receber" status={status} de={de} ate={ate} />
      <ListaReceber contas={contas} />
    </>
  );
}

const FORMAS_COM_TAXA = ["credito", "debito", "pix"];

async function AbaTaxas({ nova }: { nova: boolean }) {
  const [vigentes, historico, formas] = await Promise.all([
    prisma.taxa_cartao.findMany({
      where: { vigencia_fim: null },
      include: { forma_pagamento: { select: { nome: true } } },
      orderBy: [
        { forma_pagamento_id: "asc" },
        { numero_parcelas: "asc" },
      ],
    }),
    prisma.taxa_cartao.findMany({
      where: { vigencia_fim: { not: null } },
      include: { forma_pagamento: { select: { nome: true } } },
      orderBy: [{ vigencia_fim: "desc" }, { id: "desc" }],
    }),
    prisma.forma_pagamento.findMany({
      where: { tipo: { in: FORMAS_COM_TAXA } },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, tipo: true },
    }),
  ]);

  return (
    <TaxasPainel
      vigentes={vigentes}
      historico={historico}
      formas={formas}
      nova={nova}
    />
  );
}

export default async function FinanceiroPage({ searchParams }: Props) {
  await exigirAcesso("financeiro");
  const params = await searchParams;
  const aba = abaFinanceiroDaUrl(params.aba);
  const mes = mesFinanceiroDaUrl(params.mes);
  const status =
    params.filtro === "pendentes"
      ? "pendentes"
      : params.status?.trim() || "aberta";
  const de = params.de && ehIsoData(params.de) ? params.de : "";
  const ate = params.ate && ehIsoData(params.ate) ? params.ate : "";
  const tipo =
    params.tipo && ehTipoCategoriaPagar(params.tipo) ? params.tipo : "todos";

  const resumo = aba === "resumo" ? await obterResumoDreMes(mes) : null;
  const faturamento =
    aba === "faturamento" ? await obterFaturamentoMes(mes) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        {aba === "despesas" ? (
          <Link
            href="/financeiro/pagar/nova"
            className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
          >
            Nova conta a pagar
          </Link>
        ) : null}
        {aba === "receber" ? (
          <Link
            href="/financeiro/receber/nova"
            className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
          >
            Nova conta a receber
          </Link>
        ) : null}
        {aba === "taxas" && params.nova !== "1" ? (
          <Link
            href="/financeiro?aba=taxas&nova=1"
            className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
          >
            Nova taxa
          </Link>
        ) : null}
      </div>

      <AbasFinanceiro atual={aba} />

      {aba === "resumo" && resumo ? <ResumoDre dados={resumo} /> : null}
      {aba === "faturamento" && faturamento ? (
        <FaturamentoPainel dados={faturamento} />
      ) : null}
      {aba === "despesas" ? (
        <AbaDespesas status={status} de={de} ate={ate} tipo={tipo} />
      ) : null}
      {aba === "receber" ? (
        <AbaReceber status={status} de={de} ate={ate} />
      ) : null}
      {aba === "taxas" ? (
        <AbaTaxas nova={params.nova === "1"} />
      ) : null}
    </div>
  );
}
