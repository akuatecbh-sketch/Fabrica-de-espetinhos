import "server-only";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { registrarAuditoria } from "@/lib/auditoria";
import { arredondarQuantidade } from "@/lib/dinheiro";
import { prisma } from "@/lib/prisma";
import {
  montarPlanoCancelamento,
  montarPlanoProducao,
  type InsumoParaPlano,
  type PlanoCancelamento,
  type PlanoProducao,
} from "@/lib/producao-calculo";

export class ErroProducao extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErroProducao";
  }
}

type ClienteTx = Prisma.TransactionClient;

const TOKEN_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function tokenIdempotenciaValido(token: string) {
  return TOKEN_UUID.test(token.trim());
}

function numero(valor: unknown) {
  return Number(valor ?? 0);
}

async function alterarEstoqueAtomico(
  tx: ClienteTx,
  params: {
    produtoId: number;
    quantidade: number;
    delta: number;
    tipo: "producao_saida_insumo" | "producao_entrada";
    origemId: number;
    usuarioId: number;
    observacao: string;
  },
) {
  const quantidade = arredondarQuantidade(params.quantidade);
  if (!(quantidade > 0)) {
    throw new ErroProducao("Quantidade da movimentação deve ser maior que zero.");
  }

  const linhas = await tx.$queryRaw<{ estoque_atual: unknown }[]>`
    UPDATE produto
    SET estoque_atual = estoque_atual + ${params.delta}::numeric
    WHERE id = ${params.produtoId}
    RETURNING estoque_atual
  `;
  if (linhas.length !== 1) {
    throw new ErroProducao("Produto não encontrado para atualizar o estoque.");
  }

  const saldoAtual = arredondarQuantidade(numero(linhas[0].estoque_atual));
  const saldoAnterior = arredondarQuantidade(saldoAtual - params.delta);

  await tx.movimentacao_estoque.create({
    data: {
      produto_id: params.produtoId,
      tipo: params.tipo,
      quantidade,
      saldo_anterior: saldoAnterior,
      saldo_atual: saldoAtual,
      origem_tipo: "producao",
      origem_id: params.origemId,
      usuario_id: params.usuarioId,
      observacao: params.observacao,
    },
  });

  return { saldoAnterior, saldoAtual };
}

async function insumosDaFicha(
  tx: ClienteTx,
  produtoFinalId: number,
): Promise<InsumoParaPlano[]> {
  const fichas = await tx.ficha_tecnica.findMany({
    where: { produto_final_id: produtoFinalId },
    include: {
      produto_ficha_tecnica_insumo_idToproduto: {
        include: { unidade_medida: { select: { sigla: true } } },
      },
    },
    orderBy: { id: "asc" },
  });

  return fichas.map((ficha) => {
    const insumo = ficha.produto_ficha_tecnica_insumo_idToproduto;
    return {
      insumoId: insumo.id,
      nome: insumo.nome,
      unidade: insumo.unidade_medida.sigla,
      quantidadeFicha: numero(ficha.quantidade),
      controlaEstoque: insumo.controla_estoque,
      estoqueAtual: numero(insumo.estoque_atual),
      custoUnitario: numero(insumo.preco_custo_medio),
    };
  });
}

export async function calcularPreviaProducao(params: {
  produtoFinalId: number;
  quantidade: number;
}): Promise<
  | { ok: true; produtoNome: string; unidade: string; plano: PlanoProducao }
  | { ok: false; error: string }
> {
  const produto = await prisma.produto.findUnique({
    where: { id: params.produtoFinalId },
    include: { unidade_medida: { select: { sigla: true } } },
  });
  if (!produto || !produto.ativo || produto.tipo !== "produto_final") {
    return { ok: false, error: "Selecione um produto final ativo." };
  }

  const quantidade = arredondarQuantidade(params.quantidade);
  if (!(quantidade > 0)) {
    return { ok: false, error: "Informe uma quantidade produzida maior que zero." };
  }

  const insumos = await insumosDaFicha(prisma, produto.id);
  if (insumos.length === 0) {
    return {
      ok: false,
      error:
        "Este produto não tem ficha técnica. Cadastre a ficha em Produtos antes de produzir.",
    };
  }

  const plano = montarPlanoProducao(quantidade, insumos);
  const linhaZerada = plano.linhas.find((linha) => !(linha.quantidadeBaixa > 0));
  if (linhaZerada) {
    return {
      ok: false,
      error: `A quantidade da ficha de ${linhaZerada.nome} é pequena demais para esta produção.`,
    };
  }

  return {
    ok: true,
    produtoNome: produto.nome,
    unidade: produto.unidade_medida.sigla,
    plano,
  };
}

export async function calcularPreviaCancelamento(producaoId: number) {
  const producao = await prisma.producao.findUnique({
    where: { id: producaoId },
    include: {
      produto: { include: { unidade_medida: { select: { sigla: true } } } },
      producao_item: {
        include: {
          insumo: { include: { unidade_medida: { select: { sigla: true } } } },
        },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!producao) return null;
  if (producao.status === "cancelada") {
    return { jaCancelada: true as const, producao };
  }

  const plano = montarPlanoCancelamento(
    numero(producao.quantidade),
    {
      id: producao.produto.id,
      nome: producao.produto.nome,
      unidade: producao.produto.unidade_medida.sigla,
      controlaEstoque: producao.produto.controla_estoque,
      estoqueAtual: numero(producao.produto.estoque_atual),
    },
    producao.producao_item.map((item) => ({
      insumoId: item.insumo_id,
      nome: item.insumo.nome,
      unidade: item.insumo.unidade_medida.sigla,
      quantidade: numero(item.quantidade),
      controlaEstoque: item.controla_estoque,
      estoqueAtual: numero(item.insumo.estoque_atual),
    })),
  );

  return { jaCancelada: false as const, producao, plano };
}

export async function registrarProducao(params: {
  produtoFinalId: number;
  quantidade: number;
  dataIso: string;
  observacao: string;
  usuarioId: number;
  token: string;
  confirmarNegativo: boolean;
}): Promise<{ id: number; duplicado: boolean }> {
  const token = params.token.trim();
  if (!tokenIdempotenciaValido(token)) {
    throw new ErroProducao("Token do formulário inválido. Recarregue a página.");
  }

  const quantidade = arredondarQuantidade(params.quantidade);
  if (!(quantidade > 0)) {
    throw new ErroProducao("Informe uma quantidade produzida maior que zero.");
  }

  const [ano, mes, dia] = params.dataIso.split("-").map(Number);
  if (!ano || !mes || !dia) {
    throw new ErroProducao("Informe a data da produção.");
  }
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  const observacao = params.observacao.trim();
  if (observacao.length > 500) {
    throw new ErroProducao("A observação deve ter no máximo 500 caracteres.");
  }

  const resultado = await prisma.$transaction(
    async (tx) => {
      const jaExiste = await tx.producao.findUnique({
        where: { token_idempotencia: token },
        select: { id: true },
      });
      if (jaExiste) {
        return { id: jaExiste.id, duplicado: true };
      }

      const produto = await tx.produto.findUnique({
        where: { id: params.produtoFinalId },
        include: { unidade_medida: { select: { sigla: true } } },
      });
      if (!produto || !produto.ativo || produto.tipo !== "produto_final") {
        throw new ErroProducao("Selecione um produto final ativo.");
      }

      const insumos = await insumosDaFicha(tx, produto.id);
      if (insumos.length === 0) {
        throw new ErroProducao(
          "Este produto não tem ficha técnica. Cadastre a ficha em Produtos antes de produzir.",
        );
      }

      const plano = montarPlanoProducao(quantidade, insumos);
      const linhaZerada = plano.linhas.find(
        (linha) => !(linha.quantidadeBaixa > 0),
      );
      if (linhaZerada) {
        throw new ErroProducao(
          `A quantidade da ficha de ${linhaZerada.nome} é pequena demais para esta produção.`,
        );
      }
      if (plano.temSaldoNegativo && !params.confirmarNegativo) {
        throw new ErroProducao(
          "Há insumo que ficará com saldo negativo. Confirme explicitamente para continuar.",
        );
      }

      let producao;
      try {
        producao = await tx.producao.create({
          data: {
            produto_final_id: produto.id,
            quantidade,
            data,
            observacao: observacao || null,
            usuario_id: params.usuarioId,
            status: "confirmada",
            custo_total: plano.custoTotal,
            token_idempotencia: token,
          },
        });
      } catch (erro) {
        if (
          erro instanceof Prisma.PrismaClientKnownRequestError &&
          erro.code === "P2002"
        ) {
          const existente = await tx.producao.findUnique({
            where: { token_idempotencia: token },
            select: { id: true },
          });
          if (existente) return { id: existente.id, duplicado: true };
        }
        throw erro;
      }

      await tx.producao_item.createMany({
        data: plano.linhas.map((linha) => ({
          producao_id: producao.id,
          insumo_id: linha.insumoId,
          quantidade: linha.quantidadeBaixa,
          custo_unitario: linha.custoUnitario,
          custo_total: linha.custoTotal,
          controla_estoque: linha.controlaEstoque,
        })),
      });

      for (const linha of plano.linhas) {
        if (!linha.controlaEstoque) continue;
        const movimento = await alterarEstoqueAtomico(tx, {
          produtoId: linha.insumoId,
          quantidade: linha.quantidadeBaixa,
          delta: -linha.quantidadeBaixa,
          tipo: "producao_saida_insumo",
          origemId: producao.id,
          usuarioId: params.usuarioId,
          observacao: `Baixa de insumo da produção #${producao.id}`,
        });
        if (movimento.saldoAtual < 0 && !params.confirmarNegativo) {
          throw new ErroProducao(
            `O estoque de ${linha.nome} ficou negativo. Confirme explicitamente para continuar.`,
          );
        }
      }

      if (produto.controla_estoque) {
        await alterarEstoqueAtomico(tx, {
          produtoId: produto.id,
          quantidade,
          delta: quantidade,
          tipo: "producao_entrada",
          origemId: producao.id,
          usuarioId: params.usuarioId,
          observacao: `Entrada do produto final da produção #${producao.id}`,
        });
      }

      return { id: producao.id, duplicado: false };
    },
    { timeout: 30000 },
  );

  if (!resultado.duplicado) {
    await registrarAuditoria({
      usuarioId: params.usuarioId,
      acao: "producao.criar",
      entidadeTipo: "producao",
      entidadeId: resultado.id,
      valorNovo: {
        produto_final_id: params.produtoFinalId,
        quantidade,
        data: params.dataIso,
      },
    });
    revalidatePath("/producao");
    revalidatePath("/estoque");
    revalidatePath("/auditoria");
  }

  return resultado;
}

export async function cancelarProducao(params: {
  producaoId: number;
  usuarioId: number;
  motivo: string;
  confirmarNegativoProduto: boolean;
}): Promise<{ id: number }> {
  const motivo = params.motivo.trim();
  if (motivo.length < 5) {
    throw new ErroProducao(
      "Informe o motivo do cancelamento (mínimo 5 caracteres).",
    );
  }

  const resultado = await prisma.$transaction(
    async (tx) => {
      const agora = new Date();
      const marcada = await tx.producao.updateMany({
        where: { id: params.producaoId, status: "confirmada" },
        data: {
          status: "cancelada",
          cancelada_em: agora,
          cancelada_por_id: params.usuarioId,
          motivo_cancelamento: motivo,
        },
      });
      if (marcada.count !== 1) {
        throw new ErroProducao("Esta produção já está cancelada.");
      }

      const producao = await tx.producao.findUniqueOrThrow({
        where: { id: params.producaoId },
        include: {
          produto: { include: { unidade_medida: { select: { sigla: true } } } },
          producao_item: {
            include: {
              insumo: {
                include: { unidade_medida: { select: { sigla: true } } },
              },
            },
            orderBy: { id: "asc" },
          },
        },
      });

      const quantidade = arredondarQuantidade(numero(producao.quantidade));

      if (producao.produto.controla_estoque) {
        const movimento = await alterarEstoqueAtomico(tx, {
          produtoId: producao.produto.id,
          quantidade,
          delta: -quantidade,
          tipo: "producao_saida_insumo",
          origemId: producao.id,
          usuarioId: params.usuarioId,
          observacao: `Cancelamento da produção #${producao.id}: retirada do produto final`,
        });
        if (movimento.saldoAtual < 0 && !params.confirmarNegativoProduto) {
          throw new ErroProducao(
            "O produto final já foi vendido e o saldo não cobre o estorno. Confirme explicitamente para continuar.",
          );
        }
      }

      for (const item of producao.producao_item) {
        if (!item.controla_estoque) continue;
        const qtd = arredondarQuantidade(numero(item.quantidade));
        await alterarEstoqueAtomico(tx, {
          produtoId: item.insumo_id,
          quantidade: qtd,
          delta: qtd,
          tipo: "producao_entrada",
          origemId: producao.id,
          usuarioId: params.usuarioId,
          observacao: `Cancelamento da produção #${producao.id}: devolução de ${item.insumo.nome}`,
        });
      }

      return { id: producao.id, quantidade };
    },
    { timeout: 30000 },
  );

  await registrarAuditoria({
    usuarioId: params.usuarioId,
    acao: "producao.cancelar",
    entidadeTipo: "producao",
    entidadeId: resultado.id,
    valorNovo: { motivo, quantidade: resultado.quantidade },
  });
  revalidatePath("/producao");
  revalidatePath(`/producao/${resultado.id}`);
  revalidatePath("/estoque");
  revalidatePath("/auditoria");

  return { id: resultado.id };
}

export async function listarProdutosFinaisParaProduzir() {
  const produtos = await prisma.produto.findMany({
    where: { ativo: true, tipo: "produto_final" },
    include: {
      unidade_medida: { select: { sigla: true } },
      _count: {
        select: {
          ficha_tecnica_ficha_tecnica_produto_final_idToproduto: true,
        },
      },
    },
    orderBy: { nome: "asc" },
  });

  return produtos.map((produto) => ({
    id: produto.id,
    nome: produto.nome,
    unidade: produto.unidade_medida.sigla,
    temFicha:
      produto._count.ficha_tecnica_ficha_tecnica_produto_final_idToproduto > 0,
  }));
}

export type { PlanoCancelamento, PlanoProducao };
