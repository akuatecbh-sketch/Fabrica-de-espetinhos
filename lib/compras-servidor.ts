import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { arredondarQuantidade } from "@/lib/dinheiro";
import {
  CATEGORIA_COMPRA_INSUMOS,
  calcularCustoMedio,
  dataVencimentoPadraoCompra,
} from "@/lib/compras";

export async function garantirCategoriaCompraInsumos(
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const existente = await db.categoria_financeira.findFirst({
    where: {
      nome: CATEGORIA_COMPRA_INSUMOS,
      tipo: "custo_variavel",
    },
  });
  if (existente) return existente;
  return db.categoria_financeira.create({
    data: { nome: CATEGORIA_COMPRA_INSUMOS, tipo: "custo_variavel" },
  });
}

export async function aplicarConfirmacaoEntrada(
  tx: Prisma.TransactionClient,
  params: {
    notaId: number;
    numero: string;
    fornecedorId: number;
    nomeFornecedor: string;
    valorTotal: number;
    dataEmissao: Date;
    dataEntrada: Date;
    usuarioId: number;
  },
) {
  const categoria = await garantirCategoriaCompraInsumos(tx);
  const itensSalvos = await tx.nota_fiscal_entrada_item.findMany({
    where: { nota_fiscal_entrada_id: params.notaId },
    orderBy: { id: "asc" },
  });
  if (itensSalvos.length === 0) throw new Error("SEM_ITENS");

  for (const item of itensSalvos) {
    const produto = await tx.produto.findUniqueOrThrow({
      where: { id: item.produto_id },
    });
    const estoqueAnterior = Number(produto.estoque_atual);
    const custoAnterior = Number(produto.preco_custo_medio ?? 0);
    const quantidade = Number(item.quantidade);
    const unitario = Number(item.valor_unitario);
    const estoqueAtual = arredondarQuantidade(estoqueAnterior + quantidade);
    const custoMedio = calcularCustoMedio(
      estoqueAnterior,
      custoAnterior,
      quantidade,
      unitario,
    );

    await tx.produto.update({
      where: { id: produto.id },
      data: {
        estoque_atual: estoqueAtual,
        preco_custo_medio: custoMedio,
      },
    });

    await tx.movimentacao_estoque.create({
      data: {
        produto_id: produto.id,
        tipo: "entrada_compra",
        quantidade,
        saldo_anterior: estoqueAnterior,
        saldo_atual: estoqueAtual,
        origem_tipo: "nota_fiscal_entrada",
        origem_id: params.notaId,
        usuario_id: params.usuarioId,
        observacao: `Entrada NF-e ${params.numero}`,
      },
    });
  }

  await tx.conta_pagar.create({
    data: {
      fornecedor_id: params.fornecedorId,
      nota_fiscal_entrada_id: params.notaId,
      categoria_id: categoria.id,
      descricao: `NF-e ${params.numero} - ${params.nomeFornecedor}`.slice(
        0,
        200,
      ),
      valor: params.valorTotal,
      data_vencimento: dataVencimentoPadraoCompra(params.dataEmissao),
      status: "aberta",
    },
  });

  await tx.nota_fiscal_entrada.update({
    where: { id: params.notaId },
    data: {
      status: "conferida",
      data_entrada: params.dataEntrada,
    },
  });
}

export async function reverterNotaConferida(
  tx: Prisma.TransactionClient,
  params: { notaId: number; usuarioId: number },
) {
  const nota = await tx.nota_fiscal_entrada.findUnique({
    where: { id: params.notaId },
    include: {
      nota_fiscal_entrada_item: { orderBy: { id: "asc" } },
      conta_pagar: true,
    },
  });
  if (!nota) throw new Error("NOTA_INEXISTENTE");
  if (nota.status !== "conferida") throw new Error("NOTA_NAO_CONFERIDA");

  const contasPagas = nota.conta_pagar.filter(
    (conta) => conta.status === "paga",
  );
  if (contasPagas.length > 0) throw new Error("CONTA_PAGA");

  for (const item of nota.nota_fiscal_entrada_item) {
    const produto = await tx.produto.findUniqueOrThrow({
      where: { id: item.produto_id },
    });
    const estoqueAnterior = Number(produto.estoque_atual);
    const quantidade = Number(item.quantidade);
    const estoqueAtual = arredondarQuantidade(estoqueAnterior - quantidade);

    await tx.produto.update({
      where: { id: produto.id },
      data: { estoque_atual: estoqueAtual },
    });

    await tx.movimentacao_estoque.create({
      data: {
        produto_id: produto.id,
        tipo: "ajuste_negativo",
        quantidade,
        saldo_anterior: estoqueAnterior,
        saldo_atual: estoqueAtual,
        origem_tipo: "nota_fiscal_entrada",
        origem_id: nota.id,
        usuario_id: params.usuarioId,
        observacao: `Reversão da NF-e ${nota.numero} cancelada`,
      },
    });
  }

  await tx.conta_pagar.updateMany({
    where: {
      nota_fiscal_entrada_id: nota.id,
      status: { not: "paga" },
    },
    data: { status: "cancelada" },
  });

  await tx.nota_fiscal_entrada.update({
    where: { id: nota.id },
    data: { status: "cancelada" },
  });
}
