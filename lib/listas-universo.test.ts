import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function fonte(relativo: string) {
  return readFileSync(relativo, "utf8");
}

describe("cards e filtros continuam no universo", () => {
  it("financeiro: DespesasResumo agrega contas abertas sem skip/take", () => {
    const src = fonte("app/(backoffice)/financeiro/page.tsx");
    expect(src).toContain("prisma.conta_pagar.aggregate");
    expect(src).toContain('categoria_financeira: { tipo: "custo_fixo" }');
    expect(src).toContain('categoria_financeira: { tipo: "custo_variavel" }');
    expect(src).toContain("FILTRO_ABERTO");
    const blocoCards = src.slice(
      src.indexOf("prisma.conta_pagar.aggregate"),
      src.indexOf("<DespesasResumo"),
    );
    expect(blocoCards).toContain('tipo: "custo_fixo"');
    expect(blocoCards).toContain('tipo: "custo_variavel"');
    expect(blocoCards).not.toContain("skip:");
    expect(blocoCards).not.toContain("take:");
    expect(src).toContain("skip: (pagina - 1) * LISTA_POR_PAGINA");
    expect(src).toContain("prisma.conta_pagar.count({ where })");
  });

  it("estoque visão geral carrega todos os ativos; cards no cliente sobre essa lista", () => {
    const page = fonte("app/(backoffice)/estoque/page.tsx");
    const aba = page.slice(
      page.indexOf("async function AbaVisaoGeral"),
      page.indexOf("async function AbaMovimentacoes"),
    );
    expect(aba).toContain("where: { ativo: true }");
    expect(aba).not.toContain("take:");
    expect(aba).not.toContain("skip:");
    expect(aba).toContain("VisaoGeralEstoque");

    const interativa = fonte("app/(backoffice)/estoque/visao-geral-interativa.tsx");
    expect(interativa).toContain("contagensVisaoEstoque(produtos)");
  });

  it("produtos estoque-baixo: COUNT no SQL sem LIMIT; take só na página de ids", () => {
    const src = fonte("app/(backoffice)/produtos/page.tsx");
    expect(src).toContain("filtro === \"estoque-baixo\"");
    expect(src).toContain("SELECT COUNT(*)::int AS total");
    expect(src).toContain("estoque_atual < COALESCE(estoque_minimo, 0)");
    const countBloco = src.slice(
      src.indexOf("SELECT COUNT(*)::int AS total"),
      src.indexOf("SELECT id"),
    );
    expect(countBloco).not.toContain("LIMIT");
    expect(src).toContain("LIMIT ${LISTA_POR_PAGINA} OFFSET ${skip}");
  });

  it("clientes: count usa o mesmo where da busca, sem take", () => {
    const src = fonte("app/(backoffice)/clientes/page.tsx");
    expect(src).toContain("prisma.cliente.count({ where })");
    expect(src).toContain("skip: (pagina - 1) * LISTA_POR_PAGINA");
    expect(src).toContain("take: LISTA_POR_PAGINA");
  });
});

describe("buscas e cadastros que precisam de todos os registros", () => {
  it("PDV, F8, pedido, relatórios e estoque não receberam take da Etapa B", () => {
    const pdv = fonte("app/(backoffice)/pdv/actions.ts");
    const f8 = fonte("lib/cliente-busca-pdv.ts");
    const pedidos = fonte("app/(backoffice)/pedidos/actions.ts");
    const receber = fonte("app/(backoffice)/financeiro/receber/nova/page.tsx");
    const inventario = fonte("app/(backoffice)/relatorios/inventario/actions.ts");
    const relatorios = fonte("lib/relatorios.ts");
    const producao = fonte("lib/producao.ts");
    const estoque = fonte("app/(backoffice)/estoque/page.tsx");

    expect(pdv).toContain("export async function buscarProdutosPdv");
    expect(pdv).toContain("take: 20");
    expect(pdv).toContain("export async function buscarClientesPdv");
    expect(f8).toContain("TAMANHO_PAGINA_CLIENTES_PDV = 30");
    expect(f8).toContain("temMais");
    expect(pedidos).toContain("export async function buscarClientesPedido");
    expect(pedidos).toContain("export async function buscarProdutosPedido");
    expect(receber).toContain("prisma.cliente.findMany");
    expect(receber).not.toContain("take:");
    expect(inventario).toContain("prisma.produto.findMany");
    expect(inventario).not.toMatch(/take:\s*\d+/);
    expect(relatorios).toContain("where: { id: { in: fatia.map");
    expect(producao).toContain("listarProdutosFinaisParaProduzir");
    expect(producao).toContain('where: { ativo: true, tipo: "produto_final" }');
    const ajuste = estoque.slice(
      estoque.indexOf("async function AbaAjuste"),
      estoque.indexOf("async function AbaProducao"),
    );
    expect(ajuste).not.toContain("take:");
  });
});
