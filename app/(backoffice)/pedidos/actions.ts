"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { filtroBuscaProduto } from "@/lib/busca-produto";
import { TIPOS_VENDA } from "@/lib/produto-tipo";
import { arredondarDinheiro, arredondarQuantidade } from "@/lib/dinheiro";
import { exigirModulo } from "@/lib/sessao";
import { obterCaixaAberto } from "@/lib/caixa";
import { soDigitos, validarCpf } from "@/lib/documento";
import { nomeExibicaoCliente } from "@/lib/cliente";
import { pedidoEditavel } from "@/lib/pedido";

export type PedidoFormState = {
  error?: string;
};

export type ClientePedidoBusca = {
  id: number;
  nome: string;
  cpf: string | null;
  cnpj: string | null;
};

export type ProdutoPedidoBusca = {
  id: number;
  nome: string;
  codigo: string | null;
  codigo_barras: string | null;
  preco_venda: string | null;
  unidade: string;
  permite_venda_pacote: boolean;
  quantidade_por_pacote: string;
  preco_pacote: string | null;
};

function revalidarPedido(pedidoId: number) {
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos/novo");
}

async function criarPedidoEmAberto(usuarioId: number) {
  return prisma.pedido.create({
    data: {
      usuario_id: usuarioId,
      status: "aberto",
      subtotal: 0,
      desconto: 0,
      total: 0,
    },
  });
}

async function resolverPedido(pedidoIdBruto: unknown, usuarioId: number) {
  const id = Number(pedidoIdBruto);
  if (Number.isInteger(id) && id > 0) {
    const pedido = await prisma.pedido.findUnique({ where: { id } });
    if (!pedido) return { error: "Pedido não encontrado." } as const;
    if (!pedidoEditavel(pedido.status)) {
      return { error: "Este pedido não pode mais ser alterado." } as const;
    }
    return { pedido, criado: false } as const;
  }

  const pedido = await criarPedidoEmAberto(usuarioId);
  return { pedido, criado: true } as const;
}

function concluir(pedidoId: number, criado: boolean) {
  revalidarPedido(pedidoId);
  if (criado) redirect(`/pedidos/${pedidoId}`);
}

async function recalcularTotais(pedidoId: number) {
  const itens = await prisma.pedido_item.findMany({
    where: { pedido_id: pedidoId },
    select: { subtotal: true },
  });
  const pedido = await prisma.pedido.findUniqueOrThrow({
    where: { id: pedidoId },
    select: { desconto: true },
  });

  const subtotal = arredondarDinheiro(
    itens.reduce((acc, item) => acc + Number(item.subtotal), 0),
  );
  const total = arredondarDinheiro(subtotal - Number(pedido.desconto));

  await prisma.pedido.update({
    where: { id: pedidoId },
    data: {
      subtotal,
      total,
      atualizado_em: new Date(),
    },
  });
}

export async function criarPedido() {
  const usuario = await exigirModulo("pedidos");
  const pedido = await criarPedidoEmAberto(usuario.id);
  redirect(`/pedidos/${pedido.id}`);
}

export async function buscarClientesPedido(
  termo: string,
): Promise<ClientePedidoBusca[]> {
  await exigirModulo("pedidos");
  const busca = termo.trim();
  const digitos = soDigitos(busca);
  if (busca.length < 2 && digitos.length < 3) return [];

  const filtros = [
    ...(busca.length >= 2
      ? [
          { nome: { contains: busca, mode: "insensitive" as const } },
          { razao_social: { contains: busca, mode: "insensitive" as const } },
          { nome_fantasia: { contains: busca, mode: "insensitive" as const } },
        ]
      : []),
    ...(digitos.length >= 3
      ? [{ cpf: { contains: digitos } }, { cnpj: { contains: digitos } }]
      : []),
  ];
  if (filtros.length === 0) return [];

  const encontrados = await prisma.cliente.findMany({
    where: { OR: filtros },
    orderBy: { nome: "asc" },
    take: 8,
    select: {
      id: true,
      nome: true,
      cpf: true,
      cnpj: true,
      tipo_pessoa: true,
      razao_social: true,
      nome_fantasia: true,
    },
  });

  return encontrados.map((cliente) => ({
    id: cliente.id,
    nome: nomeExibicaoCliente(cliente),
    cpf: cliente.cpf,
    cnpj: cliente.cnpj,
  }));
}

export async function buscarProdutosPedido(
  termo: string,
): Promise<ProdutoPedidoBusca[]> {
  await exigirModulo("pedidos");
  const where = filtroBuscaProduto(termo, TIPOS_VENDA);
  if (!where) return [];

  const produtos = await prisma.produto.findMany({
    where,
    include: { unidade_medida: true },
    orderBy: { nome: "asc" },
    take: 20,
  });

  return produtos.map((produto) => ({
    id: produto.id,
    nome: produto.nome,
    codigo: produto.codigo,
    codigo_barras: produto.codigo_barras,
    preco_venda: produto.preco_venda?.toString() ?? null,
    unidade: produto.unidade_medida.sigla,
    permite_venda_pacote: produto.permite_venda_pacote,
    quantidade_por_pacote: produto.quantidade_por_pacote.toString(),
    preco_pacote: produto.preco_pacote?.toString() ?? null,
  }));
}

export async function vincularClientePedido(
  pedidoId: number | null,
  clienteId: number,
): Promise<PedidoFormState> {
  const usuario = await exigirModulo("pedidos");
  if (!Number.isInteger(clienteId)) {
    return { error: "Dados inválidos para vincular o cliente." };
  }

  const contexto = await resolverPedido(pedidoId, usuario.id);
  if ("error" in contexto) return { error: contexto.error };

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true },
  });
  if (!cliente) return { error: "Cliente não encontrado." };

  await prisma.pedido.update({
    where: { id: contexto.pedido.id },
    data: { cliente_id: cliente.id, atualizado_em: new Date() },
  });
  concluir(contexto.pedido.id, contexto.criado);
  return {};
}

export async function removerClientePedido(
  pedidoId: number,
): Promise<PedidoFormState> {
  await exigirModulo("pedidos");
  const contexto = await resolverPedido(pedidoId, 0);
  if ("error" in contexto) return { error: contexto.error };

  await prisma.pedido.update({
    where: { id: contexto.pedido.id },
    data: { cliente_id: null, atualizado_em: new Date() },
  });
  revalidarPedido(contexto.pedido.id);
  return {};
}

export async function cadastrarClienteNoPedido(
  pedidoId: number | null,
  dados: { nome: string; cpf: string; telefone: string },
): Promise<PedidoFormState> {
  const usuario = await exigirModulo("pedidos");
  const contexto = await resolverPedido(pedidoId, usuario.id);
  if ("error" in contexto) return { error: contexto.error };

  const nome = dados.nome.trim();
  if (!nome) return { error: "Informe o nome do cliente." };
  if (nome.length > 150) {
    return { error: "O nome deve ter no máximo 150 caracteres." };
  }

  let cpf: string | null = null;
  const cpfBruto = dados.cpf.trim();
  if (cpfBruto) {
    const digitos = soDigitos(cpfBruto);
    if (!validarCpf(digitos)) {
      return { error: "CPF inválido. Verifique os dígitos e tente novamente." };
    }
    cpf = digitos;
  }

  let telefone: string | null = null;
  const telefoneBruto = dados.telefone.trim();
  if (telefoneBruto) {
    const digitos = soDigitos(telefoneBruto);
    if (digitos.length < 10 || digitos.length > 11) {
      return { error: "Telefone inválido. Use DDD + número." };
    }
    telefone = digitos;
  }

  try {
    const cliente = await prisma.cliente.create({
      data: { tipo_pessoa: "fisica", nome, cpf, telefone },
    });
    await prisma.pedido.update({
      where: { id: contexto.pedido.id },
      data: { cliente_id: cliente.id, atualizado_em: new Date() },
    });
  } catch (erro) {
    if (
      typeof erro === "object" &&
      erro !== null &&
      "code" in erro &&
      erro.code === "P2002"
    ) {
      return { error: "Já existe um cliente com este CPF." };
    }
    return { error: "Não foi possível cadastrar o cliente." };
  }

  revalidatePath("/clientes");
  concluir(contexto.pedido.id, contexto.criado);
  return {};
}

export async function salvarObservacaoPedido(
  _estado: PedidoFormState,
  formData: FormData,
): Promise<PedidoFormState> {
  const usuario = await exigirModulo("pedidos");
  const contexto = await resolverPedido(formData.get("pedido_id"), usuario.id);
  if ("error" in contexto) return { error: contexto.error };

  const observacaoBruta = String(formData.get("observacao") ?? "").trim();
  await prisma.pedido.update({
    where: { id: contexto.pedido.id },
    data: {
      observacao: observacaoBruta || null,
      atualizado_em: new Date(),
    },
  });
  concluir(contexto.pedido.id, contexto.criado);
  return {};
}

export async function adicionarItemPedido(
  _estado: PedidoFormState,
  formData: FormData,
): Promise<PedidoFormState> {
  const usuario = await exigirModulo("pedidos");
  const produtoId = Number(formData.get("produto_id"));
  const modoVenda = String(formData.get("modo_venda") ?? "unidade").trim();

  if (!Number.isInteger(produtoId)) {
    return { error: "Dados inválidos para adicionar o item." };
  }

  const contexto = await resolverPedido(formData.get("pedido_id"), usuario.id);
  if ("error" in contexto) return { error: contexto.error };

  const produto = await prisma.produto.findFirst({
    where: {
      id: produtoId,
      ativo: true,
      tipo: { in: [...TIPOS_VENDA] },
    },
  });
  if (!produto) {
    return {
      error: "Produto não encontrado, inativo ou não pode ser vendido.",
    };
  }

  if (modoVenda === "pacote") {
    if (!produto.permite_venda_pacote) {
      return { error: "Este produto não permite venda em pacote." };
    }
    const quantidadePorPacote = Number(produto.quantidade_por_pacote);
    const precoPacote =
      produto.preco_pacote == null ? NaN : Number(produto.preco_pacote);
    const quantidadePacotes = Number(
      String(formData.get("quantidade_pacotes") ?? "")
        .trim()
        .replace(",", "."),
    );
    if (!Number.isInteger(quantidadePacotes) || quantidadePacotes < 1) {
      return {
        error: "Informe uma quantidade de pacotes inteira, no mínimo 1.",
      };
    }
    if (
      !Number.isFinite(quantidadePorPacote) ||
      quantidadePorPacote <= 1 ||
      !Number.isFinite(precoPacote)
    ) {
      return { error: "Produto sem preço ou quantidade de pacote cadastrados." };
    }

    const preco_pacote_aplicado = arredondarDinheiro(precoPacote);
    const quantidade = arredondarQuantidade(
      quantidadePacotes * quantidadePorPacote,
    );
    const preco_unitario = arredondarDinheiro(
      preco_pacote_aplicado / quantidadePorPacote,
    );
    const subtotal = arredondarDinheiro(
      quantidadePacotes * preco_pacote_aplicado,
    );

    await prisma.pedido_item.create({
      data: {
        pedido_id: contexto.pedido.id,
        produto_id: produto.id,
        quantidade,
        preco_unitario,
        desconto: 0,
        subtotal,
        vendido_em_pacote: true,
        quantidade_pacotes: quantidadePacotes,
        preco_pacote_aplicado,
      },
    });
    await recalcularTotais(contexto.pedido.id);
    concluir(contexto.pedido.id, contexto.criado);
    return {};
  }

  const quantidadeBruta = String(formData.get("quantidade") ?? "")
    .trim()
    .replace(",", ".");
  const quantidade = Number(quantidadeBruta);
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return { error: "Informe uma quantidade maior que zero." };
  }
  if (produto.preco_venda == null) {
    return { error: "Produto sem preço de venda cadastrado." };
  }

  const preco_unitario = arredondarDinheiro(Number(produto.preco_venda));
  const subtotal = arredondarDinheiro(quantidade * preco_unitario);

  await prisma.pedido_item.create({
    data: {
      pedido_id: contexto.pedido.id,
      produto_id: produto.id,
      quantidade,
      preco_unitario,
      desconto: 0,
      subtotal,
      vendido_em_pacote: false,
      quantidade_pacotes: null,
      preco_pacote_aplicado: null,
    },
  });
  await recalcularTotais(contexto.pedido.id);
  concluir(contexto.pedido.id, contexto.criado);
  return {};
}

export async function atualizarQuantidadeItem(
  itemId: number,
  _estado: PedidoFormState,
  formData: FormData,
): Promise<PedidoFormState> {
  await exigirModulo("pedidos");
  if (!Number.isInteger(itemId)) {
    return { error: "Item inválido." };
  }

  const item = await prisma.pedido_item.findUnique({
    where: { id: itemId },
  });
  if (!item) return { error: "Item não encontrado." };

  const contexto = await resolverPedido(item.pedido_id, 0);
  if ("error" in contexto) return { error: contexto.error };

  if (item.vendido_em_pacote) {
    const quantidadePacotes = Number(
      String(formData.get("quantidade_pacotes") ?? "")
        .trim()
        .replace(",", "."),
    );
    if (!Number.isInteger(quantidadePacotes) || quantidadePacotes < 1) {
      return {
        error: "Informe uma quantidade de pacotes inteira, no mínimo 1.",
      };
    }
    const pacotesAtuais = item.quantidade_pacotes ?? 0;
    if (pacotesAtuais < 1 || item.preco_pacote_aplicado == null) {
      return { error: "Item em pacote sem snapshot de preço." };
    }
    const unidadesPorPacote = Number(item.quantidade) / pacotesAtuais;
    const precoPacote = Number(item.preco_pacote_aplicado);
    const quantidade = arredondarQuantidade(
      quantidadePacotes * unidadesPorPacote,
    );
    const subtotal = arredondarDinheiro(quantidadePacotes * precoPacote);

    await prisma.pedido_item.update({
      where: { id: item.id },
      data: {
        quantidade_pacotes: quantidadePacotes,
        quantidade,
        subtotal,
      },
    });
  } else {
    const quantidadeBruta = String(formData.get("quantidade") ?? "")
      .trim()
      .replace(",", ".");
    const quantidade = Number(quantidadeBruta);
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      return { error: "Informe uma quantidade maior que zero." };
    }
    const subtotal = arredondarDinheiro(quantidade * Number(item.preco_unitario));
    await prisma.pedido_item.update({
      where: { id: item.id },
      data: {
        quantidade: arredondarQuantidade(quantidade),
        subtotal,
      },
    });
  }

  await recalcularTotais(item.pedido_id);
  revalidarPedido(item.pedido_id);
  return {};
}

export async function removerItemPedido(itemId: number) {
  await exigirModulo("pedidos");
  const item = await prisma.pedido_item.findUnique({
    where: { id: itemId },
  });
  if (!item) return;

  const contexto = await resolverPedido(item.pedido_id, 0);
  if ("error" in contexto) return;

  await prisma.pedido_item.delete({ where: { id: itemId } });
  await recalcularTotais(item.pedido_id);
  revalidarPedido(item.pedido_id);
}

export async function marcarPedidoEnviado(
  pedidoId: number,
): Promise<PedidoFormState> {
  await exigirModulo("pedidos");
  if (!Number.isInteger(pedidoId)) return { error: "Pedido inválido." };

  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) return { error: "Pedido não encontrado." };
  if (pedido.status !== "aberto") {
    return { error: "Só é possível enviar um pedido em aberto." };
  }

  await prisma.pedido.update({
    where: { id: pedido.id },
    data: {
      status: "enviado",
      enviado_em: new Date(),
      atualizado_em: new Date(),
      token_publico: pedido.token_publico ?? crypto.randomUUID(),
    },
  });
  revalidarPedido(pedido.id);
  return {};
}

export async function cancelarPedido(
  pedidoId: number,
): Promise<PedidoFormState> {
  await exigirModulo("pedidos");
  if (!Number.isInteger(pedidoId)) return { error: "Pedido inválido." };

  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) return { error: "Pedido não encontrado." };
  if (!pedidoEditavel(pedido.status)) {
    return { error: "Este pedido não pode ser cancelado." };
  }

  await prisma.pedido.update({
    where: { id: pedido.id },
    data: {
      status: "cancelado",
      cancelado_em: new Date(),
      atualizado_em: new Date(),
    },
  });
  revalidarPedido(pedido.id);
  return {};
}

const STATUS_VENDAS_PENDENTES = ["aberta", "em_espera"] as const;

export async function converterPedidoEmVenda(pedidoId: number) {
  const usuario = await exigirModulo("pedidos");
  if (!Number.isInteger(pedidoId)) {
    return { error: "Pedido inválido." };
  }

  const caixa = await obterCaixaAberto();
  if (!caixa) {
    redirect("/caixa?aviso=converter-pedido");
  }

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: {
      cliente: {
        select: {
          nome: true,
          tipo_pessoa: true,
          razao_social: true,
          nome_fantasia: true,
        },
      },
      pedido_item: { orderBy: { id: "asc" } },
    },
  });
  if (!pedido) return { error: "Pedido não encontrado." };
  if (pedido.status === "convertido") {
    return { error: "Este pedido já foi convertido em venda." };
  }
  if (!pedidoEditavel(pedido.status)) {
    return { error: "Este pedido não pode ser convertido em venda." };
  }
  if (pedido.pedido_item.length === 0) {
    return { error: "Adicione pelo menos um item antes de vender." };
  }

  const nomeCliente = pedido.cliente
    ? nomeExibicaoCliente(pedido.cliente)
    : null;
  const abaRotulo = nomeCliente ? nomeCliente.slice(0, 30) : null;
  const agora = new Date();
  const subtotal = arredondarDinheiro(
    pedido.pedido_item.reduce((acc, item) => acc + Number(item.subtotal), 0),
  );

  await prisma.$transaction(async (tx) => {
    await tx.venda.updateMany({
      where: { status: { in: [...STATUS_VENDAS_PENDENTES] } },
      data: { status: "em_espera", atualizado_em: agora },
    });

    const venda = await tx.venda.create({
      data: {
        caixa_id: caixa.id,
        cliente_id: pedido.cliente_id,
        operador_id: usuario.id,
        status: "aberta",
        aba_rotulo: abaRotulo,
        subtotal,
        desconto: 0,
        total: subtotal,
        venda_item: {
          create: pedido.pedido_item.map((item) => ({
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            desconto: item.desconto,
            subtotal: item.subtotal,
            observacao: item.observacao,
            vendido_em_pacote: item.vendido_em_pacote,
            quantidade_pacotes: item.quantidade_pacotes,
            preco_pacote_aplicado: item.preco_pacote_aplicado,
          })),
        },
      },
    });

    const marcado = await tx.pedido.updateMany({
      where: {
        id: pedido.id,
        status: { in: ["aberto", "enviado"] },
      },
      data: {
        status: "convertido",
        venda_id: venda.id,
        atualizado_em: agora,
      },
    });
    if (marcado.count !== 1) {
      throw new Error("Pedido não está mais disponível para conversão.");
    }
  });

  revalidarPedido(pedido.id);
  revalidatePath("/pdv");
  redirect("/pdv");
}
