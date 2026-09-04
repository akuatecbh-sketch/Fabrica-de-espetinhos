import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { soDigitos } from "@/lib/documento";
import { exigirAcesso } from "@/lib/permissoes";
import { ListaClientes } from "./lista-clientes";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function ClientesPage({ searchParams }: Props) {
  await exigirAcesso("clientes");
  const { q: buscaBruta } = await searchParams;
  const busca = (buscaBruta ?? "").trim();
  const digitos = soDigitos(busca);

  const clientes = await prisma.cliente.findMany({
    where: busca
      ? {
          OR: [
            { nome: { contains: busca, mode: "insensitive" } },
            ...(digitos ? [{ cpf: { contains: digitos } }] : []),
          ],
        }
      : undefined,
    orderBy: { nome: "asc" },
  });

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
          Buscar por nome ou CPF
          <input
            name="q"
            defaultValue={busca}
            placeholder="Nome ou CPF"
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
        vazio={
          busca
            ? "Nenhum cliente encontrado para essa busca."
            : "Nenhum cliente cadastrado."
        }
      />
    </div>
  );
}
