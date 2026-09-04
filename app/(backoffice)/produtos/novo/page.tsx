import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { criarProduto } from "../actions";
import { ProdutoForm } from "../produto-form";

export default async function NovoProdutoPage() {
  const [categorias, unidades] = await Promise.all([
    prisma.categoria_produto.findMany({ orderBy: { nome: "asc" } }),
    prisma.unidade_medida.findMany({ orderBy: { sigla: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/produtos" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para produtos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Novo produto
        </h1>
      </div>
      <ProdutoForm
        action={criarProduto}
        categorias={categorias}
        unidades={unidades}
        submitLabel="Cadastrar"
      />
    </div>
  );
}
