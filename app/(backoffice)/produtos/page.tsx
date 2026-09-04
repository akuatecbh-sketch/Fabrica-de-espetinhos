import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirAcesso } from "@/lib/permissoes";
import { abaDaUrl, tiposDaAba } from "@/lib/produto-tipo";
import { ListaProdutos } from "./lista-produtos";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ aba?: string; filtro?: string }>;
};

export default async function ProdutosPage({ searchParams }: Props) {
  await exigirAcesso("produtos");
  const { aba: abaParam, filtro } = await searchParams;
  const aba = abaDaUrl(abaParam);
  const filtroEstoque = filtro === "estoque-baixo";
  const restringirAba = Boolean(abaParam) || !filtroEstoque;

  const produtosBrutos = await prisma.produto.findMany({
    where: {
      ...(restringirAba ? { tipo: { in: tiposDaAba(aba) } } : {}),
      ...(filtroEstoque ? { ativo: true } : {}),
    },
    include: {
      categoria_produto: true,
      unidade_medida: true,
    },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  const produtos = filtroEstoque
    ? produtosBrutos.filter(
        (produto) =>
          Number(produto.estoque_atual) < Number(produto.estoque_minimo ?? 0),
      )
    : produtosBrutos;

  const hrefAba = (alvo: string) =>
    filtroEstoque
      ? `/produtos?aba=${alvo}&filtro=estoque-baixo`
      : `/produtos?aba=${alvo}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
        <Link
          href="/produtos/novo"
          className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
        >
          Novo produto
        </Link>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200">
        <Link
          href={hrefAba("vendas")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm ${
            restringirAba && aba === "vendas"
              ? "border-brasa font-medium text-texto-primario"
              : "border-transparent text-texto-secundario hover:text-texto-primario"
          }`}
        >
          Estoque de Vendas
        </Link>
        <Link
          href={hrefAba("insumos")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm ${
            restringirAba && aba === "insumos"
              ? "border-brasa font-medium text-texto-primario"
              : "border-transparent text-texto-secundario hover:text-texto-primario"
          }`}
        >
          Estoque de Insumos
        </Link>
      </nav>

      {filtroEstoque ? (
        <div className="flex items-center gap-2 self-start rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-900">
          <span>Filtrando: Estoque baixo</span>
          <Link
            href={abaParam ? `/produtos?aba=${aba}` : "/produtos"}
            className="rounded px-1 font-medium hover:bg-amber-100"
            aria-label="Limpar filtro de estoque baixo"
          >
            ×
          </Link>
        </div>
      ) : null}

      <ListaProdutos
        produtos={produtos}
        vazio={
          filtroEstoque
            ? "Nenhum produto com estoque abaixo do mínimo."
            : aba === "vendas"
              ? 'Nenhum produto de venda cadastrado. Use "Novo produto" e escolha uma categoria de produto final ou revenda.'
              : 'Nenhum insumo ou embalagem cadastrado. Use "Novo produto" e escolha uma categoria de insumo ou embalagem.'
        }
      />
    </div>
  );
}
