import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { soDigitos } from "@/lib/documento";
import { LISTA_POR_PAGINA, paginaDaUrl } from "@/lib/paginacao";
import { exigirAcesso } from "@/lib/permissoes";
import { ListaClientes } from "./lista-clientes";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string; pagina?: string }>;
};

function hrefListaClientes(params: { q?: string; pagina?: number }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.pagina && params.pagina > 1) sp.set("pagina", String(params.pagina));
  const qs = sp.toString();
  return qs ? `/clientes?${qs}` : "/clientes";
}

export default async function ClientesPage({ searchParams }: Props) {
  await exigirAcesso("clientes");
  const { q: buscaBruta, pagina: paginaBruta } = await searchParams;
  const busca = (buscaBruta ?? "").trim();
  const digitos = soDigitos(busca);
  const pagina = paginaDaUrl(paginaBruta);
  const where: Prisma.clienteWhereInput | undefined = busca
    ? {
        OR: [
          { nome: { contains: busca, mode: "insensitive" } },
          { razao_social: { contains: busca, mode: "insensitive" } },
          { nome_fantasia: { contains: busca, mode: "insensitive" } },
          ...(digitos
            ? [
                { cpf: { contains: digitos } },
                { cnpj: { contains: digitos } },
              ]
            : []),
        ],
      }
    : undefined;

  const [total, clientes] = await Promise.all([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      orderBy: { nome: "asc" },
      skip: (pagina - 1) * LISTA_POR_PAGINA,
      take: LISTA_POR_PAGINA,
    }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(total / LISTA_POR_PAGINA));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <Link
          href="/clientes/novo"
          className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
        >
          Novo cliente
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 w-full flex-1 flex-col gap-1 text-sm sm:min-w-64">
          Buscar por nome, CPF, razão social ou CNPJ
          <input
            name="q"
            defaultValue={busca}
            placeholder="Nome, CPF, razão social ou CNPJ"
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Buscar
        </button>
      </form>

      <ListaClientes
        clientes={clientes}
        pagina={pagina}
        totalPaginas={totalPaginas}
        hrefPagina={(proxima) =>
          hrefListaClientes({ q: busca || undefined, pagina: proxima })
        }
        vazio={
          busca
            ? "Nenhum cliente encontrado para essa busca."
            : "Nenhum cliente cadastrado."
        }
      />
    </div>
  );
}
