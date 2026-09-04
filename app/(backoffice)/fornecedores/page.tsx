import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { soDigitos } from "@/lib/documento";
import { ListaFornecedores } from "./lista-fornecedores";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function FornecedoresPage({ searchParams }: Props) {
  const { q: buscaBruta } = await searchParams;
  const busca = (buscaBruta ?? "").trim();
  const digitos = soDigitos(busca);

  const fornecedores = await prisma.fornecedor.findMany({
    where: busca
      ? {
          OR: [
            { razao_social: { contains: busca, mode: "insensitive" } },
            { nome_fantasia: { contains: busca, mode: "insensitive" } },
            ...(digitos ? [{ cnpj_cpf: { contains: digitos } }] : []),
          ],
        }
      : undefined,
    orderBy: [{ ativo: "desc" }, { razao_social: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Fornecedores</h1>
        <Link
          href="/fornecedores/novo"
          className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
        >
          Novo fornecedor
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 w-full flex-1 flex-col gap-1 text-sm sm:min-w-64">
          Buscar por razão social ou documento
          <input
            name="q"
            defaultValue={busca}
            placeholder="Razão social ou CNPJ/CPF"
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

      <ListaFornecedores
        fornecedores={fornecedores}
        vazio={
          busca
            ? "Nenhum fornecedor encontrado para essa busca."
            : "Nenhum fornecedor cadastrado."
        }
      />
    </div>
  );
}
