"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { emitirNfce } from "@/lib/nfce";
import { emitirNfe } from "@/lib/nfe";
import {
  classificacaoFiscalCompleta,
  mensagemProdutosSemClassificacaoFiscal,
} from "@/lib/classificacao-fiscal";
import { filtroBuscaProduto } from "@/lib/busca-produto";
import { TIPOS_VENDA } from "@/lib/produto-tipo";
import { obterCaixaAberto } from "@/lib/caixa";
import { arredondarDinheiro, arredondarQuantidade } from "@/lib/dinheiro";
import {
  garantirFormasPagamento,
  listarTaxasVigentes,
} from "@/lib/formas-pagamento";
import { exigirModulo } from "@/lib/sessao";
import { resolverTaxa } from "@/lib/taxa";
import { soDigitos, validarCpf } from "@/lib/documento";
import { ehPessoaJuridica, nomeExibicaoCliente } from "@/lib/cliente";
import { ehTipoCupom, type TipoCupom } from "@/lib/tipo-cupom";

export type PdvFormState = {
  error?: string;
  tipo_cupom?: string;
  vendaId?: number;
};

const STATUS_PENDENTES = ["aberta", "em_espera"] as const;

async function definirFoco(vendaId: number) {
  const agora = new Date();
  await prisma.$transaction([
    prisma.venda.updateMany({
      where: {
        status: { in: [...STATUS_PENDENTES] },
        NOT: { id: vendaId },
      },
      data: { status: "em_espera", atualizado_em: agora },
    }),
    prisma.venda.update({
      where: { id: vendaId },
      data: { status: "aberta", atualizado_em: agora },
    }),
  ]);
}

async function garantirVendaAberta(vendaId: number) {
  const caixa = await obterCaixaAberto();
  if (!caixa) redirect("/caixa");

  const venda = await prisma.venda.findFirst({
    where: { id: vendaId, status: "aberta" },
  });
  if (!venda) {
    return { error: "Venda não encontrada ou não está em foco." } as const;
  }
  return { caixa, venda } as const;
}

async function recalcularTotais(vendaId: number) {
  const itens = await prisma.venda_item.findMany({
    where: { venda_id: vendaId },
    select: { subtotal: true },
  });
  const venda = await prisma.venda.findUniqueOrThrow({
    where: { id: vendaId },
    select: { desconto: true },
  });

  const subtotal = arredondarDinheiro(
    itens.reduce((acc, item) => acc + Number(item.subtotal), 0),
  );
  const total = arredondarDinheiro(subtotal - Number(venda.desconto));

  await prisma.venda.update({
    where: { id: vendaId },
    data: {
      subtotal,
      total,
      atualizado_em: new Date(),
    },
  });
}

export async function criarVenda() {
  const operador = await exigirModulo("pdv");
  const caixa = await obterCaixaAberto();
  if (!caixa) redirect("/caixa");
  const agora = new Date();

  await prisma.venda.updateMany({
    where: { status: { in: [...STATUS_PENDENTES] } },
    data: { status: "em_espera", atualizado_em: agora },
  });

  await prisma.venda.create({
    data: {
      caixa_id: caixa.id,
      operador_id: operador.id,
      status: "aberta",
      subtotal: 0,
      desconto: 0,
      total: 0,
    },
  });

  revalidatePath("/pdv");
}

export async function focarVenda(vendaId: number) {
  await exigirModulo("pdv");
  const caixa = await obterCaixaAberto();
  if (!caixa) redirect("/caixa");

  const venda = await prisma.venda.findFirst({
    where: { id: vendaId, status: { in: [...STATUS_PENDENTES] } },
  });
  if (!venda) return;

  await definirFoco(venda.id);
  revalidatePath("/pdv");
}

export async function cancelarVenda(vendaId: number) {
  await exigirModulo("pdv");
  const caixa = await obterCaixaAberto();
  if (!caixa) redirect("/caixa");

  const venda = await prisma.venda.findFirst({
    where: { id: vendaId, status: "aberta" },
  });
  if (!venda) return;

  const agora = new Date();
  await prisma.venda.update({
    where: { id: venda.id },
    data: { status: "cancelada", atualizado_em: agora },
  });

  const proxima = await prisma.venda.findFirst({
    where: { status: "em_espera" },
    orderBy: { id: "desc" },
  });
  if (proxima) {
    await definirFoco(proxima.id);
  }

  revalidatePath("/pdv");
}

export type ClienteBusca = {
  id: number;
  nome: string;
  cpf: string | null;
  cnpj: string | null;
};

export type ProdutoPdvBusca = {
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

export async function buscarProdutosPdv(
  termo: string,
): Promise<ProdutoPdvBusca[]> {
  await exigirModulo("pdv");
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

export async function buscarClientesPdv(termo: string): Promise<ClienteBusca[]> {
  await exigirModulo("pdv");
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
      ? [
          { cpf: { contains: digitos } },
          { cnpj: { contains: digitos } },
        ]
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

export async function vincularClienteVenda(
  vendaId: number,
  clienteId: number,
): Promise<PdvFormState> {
  await exigirModulo("pdv");
  if (!Number.isInteger(vendaId) || !Number.isInteger(clienteId)) {
    return { error: "Dados inválidos para vincular o cliente." };
  }

  const contexto = await garantirVendaAberta(vendaId);
  if ("error" in contexto) return { error: contexto.error };

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true },
  });
  if (!cliente) return { error: "Cliente não encontrado." };

  await prisma.venda.update({
    where: { id: vendaId },
    data: { cliente_id: cliente.id, atualizado_em: new Date() },
  });
  revalidatePath("/pdv");
  return {};
}

export async function removerClienteVenda(
  vendaId: number,
): Promise<PdvFormState> {
  await exigirModulo("pdv");
  const contexto = await garantirVendaAberta(vendaId);
  if ("error" in contexto) return { error: contexto.error };

  await prisma.venda.update({
    where: { id: vendaId },
    data: { cliente_id: null, atualizado_em: new Date() },
  });
  revalidatePath("/pdv");
  return {};
}

export async function cadastrarClienteNaVenda(
  vendaId: number,
  dados: { nome: string; cpf: string; telefone: string },
): Promise<PdvFormState> {
  await exigirModulo("pdv");
  const contexto = await garantirVendaAberta(vendaId);
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
    await prisma.venda.update({
      where: { id: vendaId },
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

  revalidatePath("/pdv");
  revalidatePath("/clientes");
  return {};
}

export async function adicionarItem(
  _estado: PdvFormState,
  formData: FormData,
): Promise<PdvFormState> {
  await exigirModulo("pdv");
  const vendaId = Number(formData.get("venda_id"));
  const produtoId = Number(formData.get("produto_id"));
  const modoVenda = String(formData.get("modo_venda") ?? "unidade").trim();

  if (!Number.isInteger(vendaId) || !Number.isInteger(produtoId)) {
    return { error: "Dados inválidos para adicionar o item." };
  }

  const contexto = await garantirVendaAberta(vendaId);
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
      error: "Produto não encontrado, inativo ou não pode ser vendido no PDV.",
    };
  }

  if (modoVenda === "pacote") {
    if (!produto.permite_venda_pacote) {
      return { error: "Este produto não permite venda em pacote." };
    }
    const quantidadePorPacote = Number(produto.quantidade_por_pacote);
    const precoPacote = produto.preco_pacote == null ? NaN : Number(produto.preco_pacote);
    const quantidadePacotes = Number(
      String(formData.get("quantidade_pacotes") ?? "").trim().replace(",", "."),
    );
    if (!Number.isInteger(quantidadePacotes) || quantidadePacotes < 1) {
      return { error: "Informe uma quantidade de pacotes inteira, no mínimo 1." };
    }
    if (
      !Number.isFinite(quantidadePorPacote) ||
      quantidadePorPacote <= 1 ||
      !Number.isFinite(precoPacote)
    ) {
      return { error: "Produto sem preço ou quantidade de pacote cadastrados." };
    }

    const preco_pacote_aplicado = arredondarDinheiro(precoPacote);
    const quantidade = arredondarQuantidade(quantidadePacotes * quantidadePorPacote);
    const preco_unitario = arredondarDinheiro(
      preco_pacote_aplicado / quantidadePorPacote,
    );
    const subtotal = arredondarDinheiro(quantidadePacotes * preco_pacote_aplicado);

    await prisma.venda_item.create({
      data: {
        venda_id: vendaId,
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
    await recalcularTotais(vendaId);
    revalidatePath("/pdv");
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

  await prisma.venda_item.create({
    data: {
      venda_id: vendaId,
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
  await recalcularTotais(vendaId);
  revalidatePath("/pdv");
  return {};
}

export async function removerItem(itemId: number) {
  await exigirModulo("pdv");
  const item = await prisma.venda_item.findUnique({
    where: { id: itemId },
  });
  if (!item) return;

  const contexto = await garantirVendaAberta(item.venda_id);
  if ("error" in contexto) return;

  await prisma.venda_item.delete({ where: { id: itemId } });
  await recalcularTotais(item.venda_id);
  revalidatePath("/pdv");
}

export type PagamentoInput = {
  forma_pagamento_id: number;
  valor: number;
  numero_parcelas: number;
};

export async function finalizarVenda(
  vendaId: number,
  pagamentos: PagamentoInput[],
  tipoCupom: TipoCupom = "fiscal",
): Promise<PdvFormState> {
  const operador = await exigirModulo("pdv");
  const contexto = await garantirVendaAberta(vendaId);
  if ("error" in contexto) return { error: contexto.error };

  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: {
      cliente: {
        select: { id: true, tipo_pessoa: true, cnpj: true },
      },
      venda_item: {
        include: {
          produto: {
            select: {
              nome: true,
              ncm: true,
              cfop_padrao: true,
              origem_mercadoria: true,
              cst_csosn: true,
              aliquota_icms: true,
              aliquota_ipi: true,
              aliquota_pis: true,
              aliquota_cofins: true,
            },
          },
        },
      },
    },
  });
  if (!venda) return { error: "Venda não encontrada." };
  if (venda.venda_item.length === 0) {
    return { error: "Adicione ao menos um item antes de finalizar." };
  }
  if (!pagamentos.length) {
    return { error: "Inclua ao menos um pagamento." };
  }
  if (!ehTipoCupom(tipoCupom)) {
    return { error: "Tipo de cupom inválido." };
  }
  if (tipoCupom === "nfe") {
    if (!ehPessoaJuridica(venda.cliente?.tipo_pessoa)) {
      return {
        error:
          "NF-e modelo 55 só pode ser emitida para cliente pessoa jurídica.",
      };
    }
    if (soDigitos(venda.cliente?.cnpj ?? "").length !== 14) {
      return {
        error:
          "O cliente pessoa jurídica precisa ter CNPJ cadastrado para emitir NF-e.",
      };
    }
    const semFiscal = [
      ...new Set(
        venda.venda_item
          .filter((item) => !classificacaoFiscalCompleta(item.produto))
          .map((item) => item.produto.nome),
      ),
    ];
    if (semFiscal.length > 0) {
      return { error: mensagemProdutosSemClassificacaoFiscal(semFiscal) };
    }
  }

  const formas = await garantirFormasPagamento();
  const taxas = await listarTaxasVigentes();
  const totalVenda = arredondarDinheiro(Number(venda.total));
  let restante = totalVenda;
  const lancamentos: {
    forma_pagamento_id: number;
    valor: number;
    troco: number;
    numero_parcelas: number;
    taxa_cartao_id: number | null;
    taxa_percentual_aplicada: number;
    valor_taxa: number;
    valor_liquido: number;
  }[] = [];

  for (const pagamento of pagamentos) {
    const forma = formas.find((item) => item.id === pagamento.forma_pagamento_id);
    if (!forma) return { error: "Forma de pagamento inválida." };

    const valor = arredondarDinheiro(Number(pagamento.valor));
    if (!Number.isFinite(valor) || valor <= 0) {
      return { error: "Informe um valor de pagamento maior que zero." };
    }

    const numero_parcelas =
      forma.tipo === "credito" ? Number(pagamento.numero_parcelas) || 1 : 1;
    if (
      forma.tipo === "credito" &&
      (!Number.isInteger(numero_parcelas) ||
        numero_parcelas < 1 ||
        numero_parcelas > 12)
    ) {
      return { error: "Número de parcelas deve ser entre 1 e 12." };
    }

    let troco = 0;
    if (forma.tipo === "dinheiro") {
      if (valor > restante) {
        troco = arredondarDinheiro(valor - restante);
        restante = 0;
      } else {
        restante = arredondarDinheiro(restante - valor);
      }
    } else {
      if (valor - restante > 0.001) {
        return {
          error: `O pagamento em ${forma.nome} não pode ser maior que o restante.`,
        };
      }
      restante = arredondarDinheiro(restante - valor);
    }

    const taxa = resolverTaxa({
      tipo: forma.tipo,
      formaPagamentoId: forma.id,
      numeroParcelas: numero_parcelas,
      taxas,
    });
    const valor_taxa = arredondarDinheiro((valor * taxa.percentual) / 100);
    const valor_liquido = arredondarDinheiro(valor - valor_taxa);

    lancamentos.push({
      forma_pagamento_id: forma.id,
      valor,
      troco,
      numero_parcelas,
      taxa_cartao_id: taxa.taxa_cartao_id,
      taxa_percentual_aplicada: taxa.percentual,
      valor_taxa,
      valor_liquido,
    });
  }

  if (restante > 0.001) {
    return { error: "A soma dos pagamentos deve cobrir o total da venda." };
  }

  const agora = new Date();

  await prisma.$transaction(async (tx) => {
    for (const lancamento of lancamentos) {
      await tx.venda_pagamento.create({
        data: {
          venda_id: venda.id,
          forma_pagamento_id: lancamento.forma_pagamento_id,
          valor: lancamento.valor,
          troco: lancamento.troco,
          status: "confirmado",
          numero_parcelas: lancamento.numero_parcelas,
          taxa_cartao_id: lancamento.taxa_cartao_id,
          taxa_percentual_aplicada: lancamento.taxa_percentual_aplicada,
          valor_taxa: lancamento.valor_taxa,
          valor_liquido: lancamento.valor_liquido,
        },
      });

      if (contexto.caixa) {
        await tx.movimentacao_caixa.create({
          data: {
            caixa_id: contexto.caixa.id,
            tipo: "venda",
            forma_pagamento_id: lancamento.forma_pagamento_id,
            valor: arredondarDinheiro(lancamento.valor - lancamento.troco),
            origem_tipo: "venda",
            origem_id: venda.id,
            usuario_id: operador.id,
          },
        });
      }
    }

    await tx.venda.update({
      where: { id: venda.id },
      data: {
        status: "finalizada",
        tipo_cupom: tipoCupom,
        finalizado_em: agora,
        atualizado_em: agora,
      },
    });
  });

  if (tipoCupom === "fiscal") {
    after(() => {
      void emitirNfce(venda.id);
    });
  }
  if (tipoCupom === "nfe") {
    after(() => {
      void emitirNfe(venda.id);
    });
  }

  const proxima = await prisma.venda.findFirst({
    where: { status: "em_espera" },
    orderBy: { id: "desc" },
  });
  if (proxima) {
    await definirFoco(proxima.id);
  }

  revalidatePath("/pdv");
  revalidatePath("/vendas/hoje");
  revalidatePath("/notas-fiscais");
  return { tipo_cupom: tipoCupom, vendaId: venda.id };
}
