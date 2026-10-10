import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { LISTA_POR_PAGINA, paginaDaUrl } from "@/lib/paginacao";
import { exigirAcesso } from "@/lib/permissoes";
import { abaDaUrl, tiposDaAba } from "@/lib/produto-tipo";
import { FiltroStatusProduto, type StatusProdutoFiltro } from "./filtro-status";
import { ListaProdutos } from "./lista-produtos";

function statusDaUrl(valor?: string): StatusProdutoFiltro {
  if (valor === "ativos" || valor === "inativos") return valor;
  return "todos";
}

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    aba?: string;
    filtro?: string;
    status?: string;
    pagina?: string;
  }>;
};

function hrefListaProdutos(params: {
  aba?: string;
  filtroEstoque?: boolean;
  status?: StatusProdutoFiltro;
  pagina?: number;
  restringirAba?: boolean;
}) {
  const sp = new URLSearchParams();
  if (params.restringirAba && params.aba) sp.set("aba", params.aba);
  if (params.filtroEstoque) sp.set("filtro", "estoque-baixo");
  if (params.status && params.status !== "todos") sp.set("status", params.status);
  if (params.pagina && params.pagina > 1) sp.set("pagina", String(params.pagina));
  const qs = sp.toString();
  return qs ? `/produtos?${qs}` : "/produtos";
}

export default async function ProdutosPage({ searchParams }: Props) {
  await exigirAcesso("produtos");
  const {
    aba: abaParam,
    filtro,
    status: statusParam,
    pagina: paginaBruta,
  } = await searchParams;
  const aba = abaDaUrl(abaParam);
  const status = statusDaUrl(statusParam);
  const filtroEstoque = filtro === "estoque-baixo";
  const restringirAba = Boolean(abaParam) || !filtroEstoque;
  const pagina = paginaDaUrl(paginaBruta);
  const skip = (pagina - 1) * LISTA_POR_PAGINA;
  const filtroAtivo = filtroEstoque
    ? { ativo: true }
    : status === "ativos"
      ? { ativo: true }
      : status === "inativos"
        ? { ativo: false }
        : {};

  const whereBase = {
    ...(restringirAba ? { tipo: { in: tiposDaAba(aba) } } : {}),
    ...filtroAtivo,
  };

  const includeRelacoes = {
    categoria_produto: true,
    unidade_medida: true,
  } as const;

  let total: number;
  let produtos: Array<{
    id: number;
    nome: string;
    codigo: string | null;
    codigo_barras: string | null;
    estoque_atual: { toString(): string };
    estoque_minimo: { toString(): string } | null;
    preco_venda: { toString(): string } | null;
    preco_atacado: { toString(): string } | null;
    preco_repasse: { toString(): string } | null;
    ativo: boolean;
    permite_venda_pacote: boolean;
    ncm: string | null;
    categoria_produto: { nome: string };
    unidade_medida: { sigla: string };
  }>;

  if (filtroEstoque) {
    const tipos = restringirAba ? tiposDaAba(aba) : null;
    const filtroTipo = tipos
      ? Prisma.sql`AND tipo IN (${Prisma.join(tipos)})`
      : Prisma.empty;
    const [contagem, ids] = await Promise.all([
      prisma.$queryRaw<{ total: number }[]>`
        SELECT COUNT(*)::int AS total
        FROM produto
        WHERE ativo = true
          AND estoque_atual < COALESCE(estoque_minimo, 0)
          ${filtroTipo}
      `,
      prisma.$queryRaw<{ id: number }[]>`
        SELECT id
        FROM produto
        WHERE ativo = true
          AND estoque_atual < COALESCE(estoque_minimo, 0)
          ${filtroTipo}
        ORDER BY ativo DESC, nome ASC
        LIMIT ${LISTA_POR_PAGINA} OFFSET ${skip}
      `,
    ]);
    total = Number(contagem[0]?.total ?? 0);
    const ordem = ids.map((linha) => linha.id);
    const encontrados = await prisma.produto.findMany({
      where: { id: { in: ordem } },
      include: includeRelacoes,
    });
    const porId = new Map(encontrados.map((produto) => [produto.id, produto]));
    produtos = ordem
      .map((id) => porId.get(id))
      .filter((produto): produto is (typeof encontrados)[number] => Boolean(produto));
  } else {
    const [contado, paginaProdutos] = await Promise.all([
      prisma.produto.count({ where: whereBase }),
      prisma.produto.findMany({
        where: whereBase,
        include: includeRelacoes,
        orderBy: [{ ativo: "desc" }, { nome: "asc" }],
        skip,
        take: LISTA_POR_PAGINA,
      }),
    ]);
    total = contado;
    produtos = paginaProdutos;
  }

  const totalPaginas = Math.max(1, Math.ceil(total / LISTA_POR_PAGINA));
  const hrefAba = (alvo: string) =>
    hrefListaProdutos({
      aba: alvo,
      filtroEstoque,
      status,
      restringirAba: true,
    });

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

      <div className="flex flex-wrap items-end gap-3">
        <FiltroStatusProduto
          aba={restringirAba ? aba : undefined}
          filtroEstoque={filtroEstoque}
          status={status}
        />
        {filtroEstoque ? (
          <div className="flex items-center gap-2 self-start rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-900">
            <span>Filtrando: Estoque baixo</span>
            <Link
              href={
                abaParam
                  ? `/produtos?aba=${aba}${status !== "todos" ? `&status=${status}` : ""}`
                  : status !== "todos"
                    ? `/produtos?status=${status}`
                    : "/produtos"
              }
              className="rounded px-1 font-medium hover:bg-amber-100"
              aria-label="Limpar filtro de estoque baixo"
            >
              ×
            </Link>
          </div>
        ) : null}
      </div>

      <ListaProdutos
        produtos={produtos}
        pagina={pagina}
        totalPaginas={totalPaginas}
        hrefPagina={(proxima) =>
          hrefListaProdutos({
            aba,
            filtroEstoque,
            status,
            pagina: proxima,
            restringirAba,
          })
        }
        vazio={
          filtroEstoque
            ? "Nenhum produto com estoque abaixo do mínimo."
            : status === "inativos"
              ? "Nenhum produto inativo nesta lista."
              : status === "ativos"
                ? "Nenhum produto ativo nesta lista."
                : aba === "vendas"
                  ? 'Nenhum produto de venda cadastrado. Use "Novo produto" e escolha uma categoria de produto final ou revenda.'
                  : 'Nenhum insumo ou embalagem cadastrado. Use "Novo produto" e escolha uma categoria de insumo ou embalagem.'
        }
      />
    </div>
  );
}
