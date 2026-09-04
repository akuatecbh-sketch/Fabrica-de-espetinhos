import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ehIsoData, dataUtcMeiaNoite } from "@/lib/financeiro";
import { STATUS_NOTA } from "@/lib/compras";
import { exigirAcesso } from "@/lib/permissoes";
import {
  SELECT_USUARIO_RELACAO,
  nomeExibicao,
} from "@/lib/visibilidade";
import { ListaCompras } from "./lista-compras";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    de?: string;
    ate?: string;
  }>;
};

export default async function ComprasPage({ searchParams }: Props) {
  const logado = await exigirAcesso("compras");
  const { q: buscaBruta, status: statusBruto, de, ate } = await searchParams;
  const busca = (buscaBruta ?? "").trim();
  const status =
    statusBruto && (STATUS_NOTA as readonly string[]).includes(statusBruto)
      ? statusBruto
      : "todas";

  const where: Prisma.nota_fiscal_entradaWhereInput = {};
  if (status && status !== "todas") {
    where.status = status;
  }
  if (de && ehIsoData(de)) {
    where.data_emissao = {
      ...(typeof where.data_emissao === "object" ? where.data_emissao : {}),
      gte: dataUtcMeiaNoite(de),
    };
  }
  if (ate && ehIsoData(ate)) {
    where.data_emissao = {
      ...(typeof where.data_emissao === "object" ? where.data_emissao : {}),
      lte: dataUtcMeiaNoite(ate),
    };
  }
  if (busca) {
    where.OR = [
      { numero: { contains: busca, mode: "insensitive" } },
      {
        fornecedor: {
          OR: [
            { razao_social: { contains: busca, mode: "insensitive" } },
            { nome_fantasia: { contains: busca, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const notas = await prisma.nota_fiscal_entrada.findMany({
    where,
    include: {
      fornecedor: {
        select: { razao_social: true, nome_fantasia: true },
      },
      usuario: { select: SELECT_USUARIO_RELACAO },
    },
    orderBy: [{ data_emissao: "desc" }, { id: "desc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Compras</h1>
        <Link
          href="/compras/nova"
          className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
        >
          Nova nota
        </Link>
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <label className="flex min-w-0 w-full flex-1 flex-col gap-1 text-sm sm:min-w-64">
          Buscar fornecedor ou número
          <input
            name="q"
            defaultValue={busca}
            placeholder="Fornecedor ou número"
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            name="status"
            defaultValue={status}
            className="rounded border border-zinc-300 bg-white px-3 py-2"
          >
            <option value="todas">Todas</option>
            <option value="lancada">Lançada</option>
            <option value="conferida">Conferida</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Emissão de
          <input
            type="date"
            name="de"
            defaultValue={de ?? ""}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          até
          <input
            type="date"
            name="ate"
            defaultValue={ate ?? ""}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Filtrar
        </button>
      </form>

      <ListaCompras
        notas={notas.map((nota) => ({
          id: nota.id,
          numero: nota.numero,
          serie: nota.serie,
          data_emissao: nota.data_emissao,
          valor_total: nota.valor_total,
          status: nota.status,
          fornecedor: nota.fornecedor,
          lancadoPor: nomeExibicao(nota.usuario, logado.perfil).nome,
        }))}
        vazio={
          busca || status !== "todas" || de || ate
            ? "Nenhuma nota encontrada para esses filtros."
            : "Nenhuma nota fiscal de entrada lançada."
        }
      />
    </div>
  );
}
