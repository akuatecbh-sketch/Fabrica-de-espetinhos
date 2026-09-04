import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ehIsoData } from "@/lib/financeiro";
import {
  ITENS_MOVIMENTACAO_POR_PAGINA,
  abaEstoqueDaUrl,
  calcularProducao,
  ehInsumoOuEmbalagem,
  ehProdutoVenda,
  ehTipoMovimentacao,
  limitesDoDiaIso,
  paginaDaUrl,
} from "@/lib/estoque";
import { exigirEstoque, obterUsuarioSessao } from "@/lib/sessao";
import { limitesDoDiaLocal } from "@/lib/vendas-hoje";
import { temAcesso } from "@/lib/permissoes";
import {
  SELECT_USUARIO_RELACAO,
  nomeExibicao,
} from "@/lib/visibilidade";
import { AbasEstoque } from "./abas";
import { AjusteForm } from "./ajuste-form";
import { ListaMovimentacoes } from "./lista-movimentacoes";
import { ListaProducao } from "./lista-producao";
import { VisaoGeralEstoque } from "./visao-geral";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    aba?: string;
    q?: string;
    tipo?: string;
    de?: string;
    ate?: string;
    pagina?: string;
  }>;
};

export default async function EstoquePage({ searchParams }: Props) {
  await exigirEstoque();
  const params = await searchParams;
  const aba = abaEstoqueDaUrl(params.aba);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Estoque</h1>
      <AbasEstoque atual={aba} />
      {aba === "geral" ? <AbaVisaoGeral /> : null}
      {aba === "movimentacoes" ? (
        <AbaMovimentacoes
          busca={(params.q ?? "").trim()}
          tipoBruto={params.tipo}
          de={params.de}
          ate={params.ate}
          paginaBruta={params.pagina}
        />
      ) : null}
      {aba === "ajuste" ? <AbaAjuste /> : null}
      {aba === "producao" ? <AbaProducao /> : null}
    </div>
  );
}

async function AbaVisaoGeral() {
  const produtos = await prisma.produto.findMany({
    where: { ativo: true },
    include: { unidade_medida: true },
  });

  let insumosAbaixoMinimo = 0;
  let vendaAbaixoIdeal = 0;
  let excesso = 0;
  const criticos = produtos
    .map((produto) => {
      const atual = Number(produto.estoque_atual);
      const minimo = Number(produto.estoque_minimo ?? 0);
      const ideal = produto.estoque_ideal != null ? Number(produto.estoque_ideal) : null;
      const maximo =
        produto.estoque_maximo != null ? Number(produto.estoque_maximo) : null;

      if (ehInsumoOuEmbalagem(produto.tipo) && atual < minimo) {
        insumosAbaixoMinimo += 1;
      }
      if (ehProdutoVenda(produto.tipo) && ideal != null && atual < ideal) {
        vendaAbaixoIdeal += 1;
      }
      if (maximo != null && atual >= maximo) {
        excesso += 1;
      }

      return {
        id: produto.id,
        nome: produto.nome,
        tipo: produto.tipo,
        estoque_atual: atual,
        estoque_minimo: minimo,
        unidade: produto.unidade_medida.sigla,
        gap: minimo - atual,
      };
    })
    .filter((item) => item.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 10)
    .map(({ gap: _gap, ...item }) => item);

  return (
    <VisaoGeralEstoque
      insumosAbaixoMinimo={insumosAbaixoMinimo}
      vendaAbaixoIdeal={vendaAbaixoIdeal}
      excesso={excesso}
      criticos={criticos}
    />
  );
}

async function AbaMovimentacoes({
  busca,
  tipoBruto,
  de,
  ate,
  paginaBruta,
}: {
  busca: string;
  tipoBruto?: string;
  de?: string;
  ate?: string;
  paginaBruta?: string;
}) {
  const tipo =
    tipoBruto && ehTipoMovimentacao(tipoBruto) ? tipoBruto : "todos";
  const deIso = de && ehIsoData(de) ? de : "";
  const ateIso = ate && ehIsoData(ate) ? ate : "";
  const pagina = paginaDaUrl(paginaBruta);

  const where: Prisma.movimentacao_estoqueWhereInput = {};
  if (busca) {
    where.produto = { nome: { contains: busca, mode: "insensitive" } };
  }
  if (tipo !== "todos") {
    where.tipo = tipo;
  }
  if (deIso || ateIso) {
    where.criado_em = {};
    if (deIso) where.criado_em.gte = limitesDoDiaIso(deIso).inicio;
    if (ateIso) where.criado_em.lt = limitesDoDiaIso(ateIso).fim;
  }

  const usuario = await obterUsuarioSessao();
  const [total, registros] = await Promise.all([
    prisma.movimentacao_estoque.count({ where }),
    prisma.movimentacao_estoque.findMany({
      where,
      include: {
        produto: { select: { nome: true } },
        usuario: { select: SELECT_USUARIO_RELACAO },
      },
      orderBy: { criado_em: "desc" },
      skip: (pagina - 1) * ITENS_MOVIMENTACAO_POR_PAGINA,
      take: ITENS_MOVIMENTACAO_POR_PAGINA,
    }),
  ]);
  const podeVerVendas = await temAcesso(usuario.id, "vendas");

  const vendaIds = [
    ...new Set(
      registros
        .filter(
          (item) => item.origem_tipo === "venda" && item.origem_id != null,
        )
        .map((item) => item.origem_id!),
    ),
  ];
  const { inicio, fim } = limitesDoDiaLocal();
  const vendasHoje =
    vendaIds.length === 0 || !podeVerVendas
      ? []
      : await prisma.venda.findMany({
          where: {
            id: { in: vendaIds },
            finalizado_em: { gte: inicio, lt: fim },
          },
          select: { id: true },
        });
  const vendasHojeIds = new Set(vendasHoje.map((venda) => venda.id));

  const movimentos = registros.map((item) => {
    let hrefOrigem: string | null = null;
    if (item.origem_tipo === "nota_fiscal_entrada" && item.origem_id) {
      hrefOrigem = `/compras/${item.origem_id}`;
    } else if (
      item.origem_tipo === "venda" &&
      item.origem_id &&
      vendasHojeIds.has(item.origem_id)
    ) {
      hrefOrigem = "/vendas/hoje";
    }
    const { usuario: operador, ...resto } = item;
    return {
      ...resto,
      hrefOrigem,
      usuario: operador
        ? nomeExibicao(operador, usuario.perfil)
        : null,
    };
  });

  const totalPaginas = Math.max(
    1,
    Math.ceil(total / ITENS_MOVIMENTACAO_POR_PAGINA),
  );

  return (
    <ListaMovimentacoes
      movimentos={movimentos}
      busca={busca}
      tipo={tipo}
      de={deIso}
      ate={ateIso}
      pagina={pagina}
      totalPaginas={total === 0 ? 1 : totalPaginas}
      perfilDeQuemVeVe={usuario.perfil}
    />
  );
}

async function AbaAjuste() {
  const produtos = await prisma.produto.findMany({
    where: { ativo: true },
    include: { unidade_medida: true },
    orderBy: { nome: "asc" },
  });

  return (
    <AjusteForm
      produtos={produtos.map((produto) => ({
        id: produto.id,
        nome: produto.nome,
        tipo: produto.tipo,
        unidade: produto.unidade_medida.sigla,
        estoque_atual: Number(produto.estoque_atual),
      }))}
    />
  );
}

async function AbaProducao() {
  const produtos = await prisma.produto.findMany({
    where: {
      ativo: true,
      tipo: "produto_final",
      estoque_ideal: { not: null },
    },
    include: {
      unidade_medida: true,
      ficha_tecnica_ficha_tecnica_produto_final_idToproduto: {
        include: {
          produto_ficha_tecnica_insumo_idToproduto: {
            include: { unidade_medida: true },
          },
        },
      },
    },
  });

  const itens = produtos
    .map((produto) => {
      const atual = Number(produto.estoque_atual);
      const ideal = Number(produto.estoque_ideal);
      const sugerida = ideal - atual;
      if (!(sugerida > 0)) return null;
      const fichas =
        produto.ficha_tecnica_ficha_tecnica_produto_final_idToproduto;
      const resultado = calcularProducao(
        sugerida,
        fichas.map((ficha) => ({
          nome: ficha.produto_ficha_tecnica_insumo_idToproduto.nome,
          unidade:
            ficha.produto_ficha_tecnica_insumo_idToproduto.unidade_medida
              .sigla,
          estoque: Number(
            ficha.produto_ficha_tecnica_insumo_idToproduto.estoque_atual,
          ),
          quantidadeFicha: Number(ficha.quantidade),
        })),
      );
      return {
        id: produto.id,
        nome: produto.nome,
        unidade: produto.unidade_medida.sigla,
        estoque_atual: atual,
        estoque_ideal: ideal,
        resultado,
      };
    })
    .filter((item) => item != null)
    .sort((a, b) => b.resultado.sugerida - a.resultado.sugerida);

  return <ListaProducao itens={itens} />;
}
