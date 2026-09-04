import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { soDigitos } from "@/lib/documento";
import { aniversarioNoMes } from "@/lib/rh";
import { exigirAcesso } from "@/lib/permissoes";
import { ListaFuncionarios } from "./lista-funcionarios";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function FuncionariosPage({ searchParams }: Props) {
  await exigirAcesso("funcionarios");
  const { q: buscaBruta } = await searchParams;
  const busca = (buscaBruta ?? "").trim();
  const digitos = soDigitos(busca);

  const registros = await prisma.funcionario.findMany({
    where: busca
      ? {
          OR: [
            { nome: { contains: busca, mode: "insensitive" } },
            ...(digitos ? [{ cpf: { contains: digitos } }] : []),
          ],
        }
      : undefined,
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  const funcionarios = registros.map((funcionario) => ({
    id: funcionario.id,
    nome: funcionario.nome,
    cargo: funcionario.cargo,
    telefone: funcionario.telefone,
    data_admissao: funcionario.data_admissao,
    ativo: funcionario.ativo,
    aniversariante: aniversarioNoMes(funcionario.data_nascimento),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Funcionários</h1>
        <Link
          href="/funcionarios/novo"
          className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
        >
          Novo funcionário
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

      <ListaFuncionarios
        funcionarios={funcionarios}
        vazio={
          busca
            ? "Nenhum funcionário encontrado para essa busca."
            : "Nenhum funcionário cadastrado."
        }
      />
    </div>
  );
}
