import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatarPreco } from "@/lib/format";
import { exigirAcesso } from "@/lib/permissoes";
import {
  abaFinanceiroDaUrl,
  dataLocalISO,
  dataUtcMeiaNoite,
  ehIsoData,
} from "@/lib/financeiro";
import type { Prisma } from "@/generated/prisma/client";
import { FiltrosContas } from "./filtros";
import { ListaPagar } from "./lista-pagar";
import { ListaReceber } from "./lista-receber";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    aba?: string;
    status?: string;
    filtro?: string;
    de?: string;
    ate?: string;
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

export default async function FinanceiroPage({ searchParams }: Props) {
  await exigirAcesso("financeiro");
  const params = await searchParams;
  const aba = abaFinanceiroDaUrl(params.aba);
  const status =
    params.filtro === "pendentes"
      ? "pendentes"
      : params.status?.trim() || "aberta";
  const de = params.de && ehIsoData(params.de) ? params.de : "";
  const ate = params.ate && ehIsoData(params.ate) ? params.ate : "";
  const hoje = dataUtcMeiaNoite(dataLocalISO());
  const periodo = filtroPeriodo(de, ate);

  const [totaisPagar, totaisReceber, contasPagar, contasReceber] =
    await Promise.all([
      prisma.conta_pagar.aggregate({
        where: { status: "aberta" },
        _sum: { valor: true },
      }),
      prisma.conta_receber.aggregate({
        where: { status: "aberta" },
        _sum: { valor: true },
      }),
      prisma.conta_pagar.findMany({
        where: wherePagar(status, hoje, periodo),
        include: {
          fornecedor: true,
          categoria_financeira: true,
        },
        orderBy: [{ data_vencimento: "asc" }, { id: "asc" }],
      }),
      prisma.conta_receber.findMany({
        where: whereReceber(status, hoje, periodo),
        include: { cliente: true },
        orderBy: [{ data_vencimento: "asc" }, { id: "asc" }],
      }),
    ]);

  const totalPagar = Number(totaisPagar._sum.valor ?? 0);
  const totalReceber = Number(totaisReceber._sum.valor ?? 0);
  const saldo = totalReceber - totalPagar;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <Link
          href={
            aba === "pagar"
              ? "/financeiro/pagar/nova"
              : "/financeiro/receber/nova"
          }
          className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
        >
          {aba === "pagar" ? "Nova conta a pagar" : "Nova conta a receber"}
        </Link>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded border border-zinc-200 bg-white px-4 py-3">
          <dt className="text-xs text-texto-secundario">A pagar em aberto</dt>
          <dd className="font-data text-lg font-medium">{formatarPreco(totalPagar)}</dd>
        </div>
        <div className="rounded border border-zinc-200 bg-white px-4 py-3">
          <dt className="text-xs text-texto-secundario">A receber em aberto</dt>
          <dd className="font-data text-lg font-medium">{formatarPreco(totalReceber)}</dd>
        </div>
        <div className="rounded border border-zinc-200 bg-white px-4 py-3">
          <dt className="text-xs text-texto-secundario">Saldo projetado</dt>
          <dd
            className={`font-data text-lg font-medium ${
              saldo < 0 ? "text-vermelho-erro" : "text-texto-primario"
            }`}
          >
            {formatarPreco(saldo)}
          </dd>
        </div>
      </dl>

      <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200">
        <Link
          href={
            status === "pendentes"
              ? "/financeiro?aba=pagar&filtro=pendentes"
              : "/financeiro?aba=pagar&status=aberta"
          }
          className={`-mb-px border-b-2 px-4 py-2 text-sm ${
            aba === "pagar"
              ? "border-brasa font-medium text-texto-primario"
              : "border-transparent text-texto-secundario hover:text-texto-primario"
          }`}
        >
          Contas a Pagar
        </Link>
        <Link
          href={
            status === "pendentes"
              ? "/financeiro?aba=receber&filtro=pendentes"
              : "/financeiro?aba=receber&status=aberta"
          }
          className={`-mb-px border-b-2 px-4 py-2 text-sm ${
            aba === "receber"
              ? "border-brasa font-medium text-texto-primario"
              : "border-transparent text-texto-secundario hover:text-texto-primario"
          }`}
        >
          Contas a Receber
        </Link>
      </nav>

      <FiltrosContas aba={aba} status={status} de={de} ate={ate} />

      {aba === "pagar" ? (
        <ListaPagar contas={contasPagar} />
      ) : (
        <ListaReceber contas={contasReceber} />
      )}
    </div>
  );
}
