import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirGerenteOuSuperAdmin } from "@/lib/sessao";
import { ListaFaq } from "./lista-faq";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function GerenciarFaqPage({ searchParams }: Props) {
  await exigirGerenteOuSuperAdmin();
  const { q: buscaBruta } = await searchParams;
  const busca = (buscaBruta ?? "").trim();

  const [registros, modulos] = await Promise.all([
    prisma.faq_item.findMany({
      where: busca
        ? { titulo: { contains: busca, mode: "insensitive" } }
        : undefined,
      orderBy: [{ ordem: "asc" }, { id: "asc" }],
    }),
    prisma.modulo.findMany({
      select: { chave: true, nome: true },
    }),
  ]);

  const nomePorChave = new Map(modulos.map((m) => [m.chave, m.nome]));
  const itens = registros.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    rota_destino: item.rota_destino,
    modulo_nome: item.modulo_chave
      ? (nomePorChave.get(item.modulo_chave) ?? item.modulo_chave)
      : "Todos",
    ordem: item.ordem,
    ativo: item.ativo,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Perguntas de ajuda
          </h1>
          <p className="mt-1 text-sm text-texto-secundario">
            Itens da busca (Ctrl+K). Desative em vez de excluir.
          </p>
        </div>
        <Link
          href="/ajuda/gerenciar/novo"
          className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
        >
          Nova pergunta
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 w-full flex-1 flex-col gap-1 text-sm sm:min-w-64">
          Buscar por título
          <input
            name="q"
            defaultValue={busca}
            placeholder="Título"
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

      <ListaFaq
        itens={itens}
        vazio={
          busca
            ? "Nenhuma pergunta encontrada para essa busca."
            : "Nenhuma pergunta cadastrada."
        }
      />
    </div>
  );
}
