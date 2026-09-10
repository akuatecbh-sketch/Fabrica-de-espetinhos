import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirAcesso } from "@/lib/permissoes";
import {
  abaFinanceiroDaUrl,
  dataLocalISO,
  dataUtcMeiaNoite,
  ehIsoData,
  mesFinanceiroDaUrl,
} from "@/lib/financeiro";
import { obterResumoDreMes } from "@/lib/resumo-financeiro";
import type { Prisma } from "@/generated/prisma/client";
import { AbasFinanceiro } from "./abas";
import { FiltrosContas } from "./filtros";
import { ListaPagar } from "./lista-pagar";
import { ListaReceber } from "./lista-receber";
import { ResumoDre } from "./resumo-dre";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    aba?: string;
    status?: string;
    filtro?: string;
    de?: string;
    ate?: string;
    mes?: string;
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
): Prisma.conta_pagarWhereInput {
  const base: Prisma.conta_pagarWhereInput = periodo
    ? { data_vencimento: periodo }
    : {};

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

async function AbaDespesas({
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
  const contas = await prisma.conta_pagar.findMany({
    where: wherePagar(status, hoje, periodo),
    include: {
      fornecedor: true,
      categoria_financeira: true,
    },
    orderBy: [{ data_vencimento: "asc" }, { id: "asc" }],
  });

  return (
    <>
      <FiltrosContas aba="despesas" status={status} de={de} ate={ate} />
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

function AbaEmBreve({ texto }: { texto: string }) {
  return <p className="text-sm text-texto-secundario">{texto}</p>;
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

  const resumo = aba === "resumo" ? await obterResumoDreMes(mes) : null;

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
      </div>

      <AbasFinanceiro atual={aba} />

      {aba === "resumo" && resumo ? <ResumoDre dados={resumo} /> : null}
      {aba === "faturamento" ? (
        <AbaEmBreve texto="O detalhamento do faturamento será adicionado em seguida." />
      ) : null}
      {aba === "despesas" ? (
        <AbaDespesas status={status} de={de} ate={ate} />
      ) : null}
      {aba === "receber" ? (
        <AbaReceber status={status} de={de} ate={ate} />
      ) : null}
      {aba === "taxas" ? (
        <AbaEmBreve texto="O detalhamento das taxas de cartão será adicionado em seguida." />
      ) : null}
    </div>
  );
}
