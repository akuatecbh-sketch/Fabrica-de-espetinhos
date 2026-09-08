import { revalidatePath } from "next/cache";
import {
  classificacaoFiscalCompleta,
  mensagemProdutosSemClassificacaoFiscal,
} from "@/lib/classificacao-fiscal";
import { ehPessoaJuridica } from "@/lib/cliente";
import { arredondarDinheiro } from "@/lib/dinheiro";
import { soDigitos } from "@/lib/documento";
import {
  ambienteFocusNfe,
  chaveAcesso44,
  consultarNfeFocus,
  mensagemErroFocus,
  montarPayloadNfe,
  numeroOpcional,
  postarNfeFocus,
  protocoloAutorizacao,
  referenciaNfe,
  tokenFocusNfe,
  urlArquivoFocus,
  type RespostaFocusNfce,
} from "@/lib/focus-nfe";
import { prisma } from "@/lib/prisma";

const MENSAGEM_SIMULADA =
  "Emissão simulada — configure FOCUS_NFE_TOKEN para emitir de verdade";

export type ResultadoEmissaoNfe = { error?: string };

type ItemCalculado = {
  produto_id: number;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ncm: string;
  cfop: string;
  origem_mercadoria: string;
  cst_csosn: string;
  aliquota_icms: number;
  valor_icms: number;
  aliquota_ipi: number;
  valor_ipi: number;
  aliquota_pis: number;
  valor_pis: number;
  aliquota_cofins: number;
  valor_cofins: number;
  codigo: string;
  unidade: string;
  desconto: number;
};

type CabecalhoNfe = {
  status: string;
  chave_acesso: string | null;
  numero: number | null;
  serie: number | null;
  protocolo_autorizacao: string | null;
  xml_url: string | null;
  danfe_url: string | null;
  data_emissao: Date | null;
  mensagem_sefaz: string | null;
  valor_total: number;
  valor_icms: number;
  valor_ipi: number;
  valor_pis: number;
  valor_cofins: number;
};

const SELECT_PRODUTO_FISCAL = {
  id: true,
  codigo: true,
  nome: true,
  ncm: true,
  cfop_padrao: true,
  origem_mercadoria: true,
  cst_csosn: true,
  aliquota_icms: true,
  aliquota_ipi: true,
  aliquota_pis: true,
  aliquota_cofins: true,
  unidade_medida: { select: { sigla: true } },
} as const;

function impostoDoItem(valorTotal: number, aliquota: unknown) {
  const percentual = Number(aliquota ?? 0);
  const seguro = Number.isFinite(percentual) ? percentual : 0;
  return {
    aliquota: seguro,
    valor: arredondarDinheiro((valorTotal * seguro) / 100),
  };
}

function nomesSemClassificacao(
  itens: {
    produto: { nome: string } & Parameters<typeof classificacaoFiscalCompleta>[0];
  }[],
) {
  return [
    ...new Set(
      itens
        .filter((item) => !classificacaoFiscalCompleta(item.produto))
        .map((item) => item.produto.nome),
    ),
  ];
}

/**
 * Emite (ou simula) a NF-e modelo 55 de uma venda já finalizada.
 * Não altera venda, estoque nem caixa. Falhas voltam em `{ error }` e
 * ficam gravadas em `nfe` para conferência / reemissão.
 */
export async function emitirNfe(vendaId: number): Promise<ResultadoEmissaoNfe> {
  try {
    return await emitirNfeInterno(vendaId);
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Falha inesperada ao emitir a NF-e.";
    try {
      await gravarNfe(vendaId, {
        cabecalho: {
          status: "pendente",
          chave_acesso: null,
          numero: null,
          serie: null,
          protocolo_autorizacao: null,
          xml_url: null,
          danfe_url: null,
          data_emissao: null,
          mensagem_sefaz: mensagem.slice(0, 2000),
          valor_total: 0,
          valor_icms: 0,
          valor_ipi: 0,
          valor_pis: 0,
          valor_cofins: 0,
        },
        itens: [],
      });
    } catch (gravacao) {
      console.error("NF-e: falha ao gravar status após erro", vendaId, gravacao);
    }
    return { error: mensagem };
  } finally {
    try {
      revalidatePath("/notas-fiscais");
      revalidatePath("/vendas/hoje");
    } catch {
      /* revalidate é opcional no after() */
    }
  }
}

async function emitirNfeInterno(vendaId: number): Promise<ResultadoEmissaoNfe> {
  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: {
      cliente: true,
      nfe: true,
      venda_item: {
        orderBy: { id: "asc" },
        include: { produto: { select: SELECT_PRODUTO_FISCAL } },
      },
      venda_pagamento: {
        where: { status: "confirmado" },
        include: { forma_pagamento: { select: { tipo: true } } },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!venda || venda.status !== "finalizada") {
    return { error: "A venda precisa estar finalizada para emitir a NF-e." };
  }
  if (venda.nfe?.status === "autorizada") return {};

  const cliente = venda.cliente;
  if (!cliente || !ehPessoaJuridica(cliente.tipo_pessoa)) {
    const mensagem =
      "NF-e modelo 55 só pode ser emitida para cliente pessoa jurídica.";
    await gravarNfe(vendaId, {
      cabecalho: cabecalhoFalha("rejeitada", mensagem, Number(venda.total)),
      itens: [],
      clienteId: cliente?.id ?? null,
    });
    return { error: mensagem };
  }

  const cnpjCliente = soDigitos(cliente.cnpj ?? "");
  if (cnpjCliente.length !== 14) {
    const mensagem =
      "O cliente pessoa jurídica precisa ter CNPJ cadastrado para emitir NF-e.";
    await gravarNfe(vendaId, {
      cabecalho: cabecalhoFalha("rejeitada", mensagem, Number(venda.total)),
      itens: [],
      clienteId: cliente.id,
    });
    return { error: mensagem };
  }

  if (venda.venda_item.length === 0) {
    const mensagem = "A venda não tem itens para emitir a NF-e.";
    await gravarNfe(vendaId, {
      cabecalho: cabecalhoFalha("pendente", mensagem, Number(venda.total)),
      itens: [],
      clienteId: cliente.id,
    });
    return { error: mensagem };
  }

  const semFiscal = nomesSemClassificacao(venda.venda_item);
  if (semFiscal.length > 0) {
    const mensagem = mensagemProdutosSemClassificacaoFiscal(semFiscal);
    await gravarNfe(vendaId, {
      cabecalho: cabecalhoFalha("rejeitada", mensagem, Number(venda.total)),
      itens: [],
      clienteId: cliente.id,
    });
    return { error: mensagem };
  }

  const itens = venda.venda_item.map((item) => {
    const valorTotal = arredondarDinheiro(Number(item.subtotal));
    const icms = impostoDoItem(valorTotal, item.produto.aliquota_icms);
    const ipi = impostoDoItem(valorTotal, item.produto.aliquota_ipi);
    const pis = impostoDoItem(valorTotal, item.produto.aliquota_pis);
    const cofins = impostoDoItem(valorTotal, item.produto.aliquota_cofins);
    return {
      produto_id: item.produto.id,
      descricao: item.produto.nome.slice(0, 120),
      quantidade: Number(item.quantidade),
      valor_unitario: Number(item.preco_unitario),
      valor_total: valorTotal,
      ncm: (item.produto.ncm ?? "").trim(),
      cfop: (item.produto.cfop_padrao ?? "").trim(),
      origem_mercadoria: (item.produto.origem_mercadoria ?? "").trim(),
      cst_csosn: (item.produto.cst_csosn ?? "").trim(),
      aliquota_icms: icms.aliquota,
      valor_icms: icms.valor,
      aliquota_ipi: ipi.aliquota,
      valor_ipi: ipi.valor,
      aliquota_pis: pis.aliquota,
      valor_pis: pis.valor,
      aliquota_cofins: cofins.aliquota,
      valor_cofins: cofins.valor,
      codigo: item.produto.codigo?.trim() || String(item.produto.id),
      unidade: item.produto.unidade_medida.sigla,
      desconto: Number(item.desconto),
    } satisfies ItemCalculado;
  });

  const totais = itens.reduce(
    (acc, item) => ({
      valor_produtos: arredondarDinheiro(acc.valor_produtos + item.valor_total),
      valor_icms: arredondarDinheiro(acc.valor_icms + item.valor_icms),
      valor_ipi: arredondarDinheiro(acc.valor_ipi + item.valor_ipi),
      valor_pis: arredondarDinheiro(acc.valor_pis + item.valor_pis),
      valor_cofins: arredondarDinheiro(acc.valor_cofins + item.valor_cofins),
      valor_total: arredondarDinheiro(acc.valor_total + item.valor_total),
    }),
    {
      valor_produtos: 0,
      valor_icms: 0,
      valor_ipi: 0,
      valor_pis: 0,
      valor_cofins: 0,
      valor_total: 0,
    },
  );

  const token = tokenFocusNfe();
  if (!token) {
    const numero = await proximoNumeroNfe(venda.nfe?.numero ?? null);
    await gravarNfe(vendaId, {
      cabecalho: {
        status: "simulado",
        chave_acesso: null,
        numero,
        serie: 1,
        protocolo_autorizacao: null,
        xml_url: null,
        danfe_url: null,
        data_emissao: new Date(),
        mensagem_sefaz: MENSAGEM_SIMULADA,
        valor_total: totais.valor_total,
        valor_icms: totais.valor_icms,
        valor_ipi: totais.valor_ipi,
        valor_pis: totais.valor_pis,
        valor_cofins: totais.valor_cofins,
      },
      itens,
      clienteId: cliente.id,
    });
    return {};
  }

  const empresa = await prisma.empresa.findUnique({ where: { id: 1 } });
  const cnpjEmitente = soDigitos(empresa?.cnpj ?? "");
  if (!empresa || cnpjEmitente.length !== 14) {
    const mensagem =
      "Cadastre o CNPJ da empresa (menu Empresa) para emitir a NF-e de verdade.";
    await gravarNfe(vendaId, {
      cabecalho: {
        ...cabecalhoFalha("pendente", mensagem, totais.valor_total),
        valor_icms: totais.valor_icms,
        valor_ipi: totais.valor_ipi,
        valor_pis: totais.valor_pis,
        valor_cofins: totais.valor_cofins,
      },
      itens,
      clienteId: cliente.id,
    });
    return { error: mensagem };
  }

  const ambiente = ambienteFocusNfe();
  const ref = referenciaNfe(venda.id);
  const payload = montarPayloadNfe({
    emitente: { cnpj: cnpjEmitente, razao_social: empresa.razao_social },
    destinatario: {
      razao_social: cliente.razao_social,
      nome: cliente.nome,
      cnpj: cliente.cnpj,
      inscricao_estadual: cliente.inscricao_estadual,
      endereco: cliente.endereco,
    },
    itens: itens.map((item) => ({
      codigo: item.codigo,
      descricao: item.descricao,
      quantidade: item.quantidade,
      preco_unitario: item.valor_unitario,
      desconto: item.desconto,
      subtotal: item.valor_total,
      unidade: item.unidade,
      ncm: item.ncm,
      cfop: item.cfop,
      origem_mercadoria: item.origem_mercadoria,
      cst_csosn: item.cst_csosn,
      aliquota_icms: item.aliquota_icms,
      valor_icms: item.valor_icms,
      aliquota_ipi: item.aliquota_ipi,
      valor_ipi: item.valor_ipi,
      aliquota_pis: item.aliquota_pis,
      valor_pis: item.valor_pis,
      aliquota_cofins: item.aliquota_cofins,
      valor_cofins: item.valor_cofins,
    })),
    pagamentos: venda.venda_pagamento.map((pagamento) => ({
      tipo: pagamento.forma_pagamento.tipo,
      valor: Number(pagamento.valor),
      troco: Number(pagamento.troco ?? 0),
    })),
    totais,
  });

  let http: number;
  let json: RespostaFocusNfce;
  try {
    ({ http, json } = await postarNfeFocus({ token, ambiente, ref, payload }));
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? `Falha de comunicação com o Focus NFe: ${erro.message}`
        : "Falha de comunicação com o Focus NFe.";
    await gravarNfe(vendaId, {
      cabecalho: {
        ...cabecalhoFalha("pendente", mensagem, totais.valor_total),
        valor_icms: totais.valor_icms,
        valor_ipi: totais.valor_ipi,
        valor_pis: totais.valor_pis,
        valor_cofins: totais.valor_cofins,
      },
      itens,
      clienteId: cliente.id,
    });
    return { error: mensagem };
  }

  if (deveConsultarNotaExistente(http, json)) {
    try {
      ({ http, json } = await consultarNfeFocus({ token, ambiente, ref }));
    } catch (erro) {
      const mensagem =
        erro instanceof Error
          ? `Nota já enviada; falha ao consultar: ${erro.message}`
          : "Nota já enviada; falha ao consultar o Focus NFe.";
      await gravarNfe(vendaId, {
        cabecalho: {
          ...cabecalhoFalha("pendente", mensagem, totais.valor_total),
          valor_icms: totais.valor_icms,
          valor_ipi: totais.valor_ipi,
          valor_pis: totais.valor_pis,
          valor_cofins: totais.valor_cofins,
        },
        itens,
        clienteId: cliente.id,
      });
      return { error: mensagem };
    }
  }

  const mapeado = mapearRespostaFocus(json, http, ambiente);
  await gravarNfe(vendaId, {
    cabecalho: {
      ...mapeado,
      valor_total: totais.valor_total,
      valor_icms: totais.valor_icms,
      valor_ipi: totais.valor_ipi,
      valor_pis: totais.valor_pis,
      valor_cofins: totais.valor_cofins,
    },
    itens,
    clienteId: cliente.id,
  });

  if (mapeado.status === "autorizada" || mapeado.status === "contingencia") {
    return {};
  }
  return { error: mapeado.mensagem_sefaz ?? "A NF-e não foi autorizada." };
}

function cabecalhoFalha(
  status: string,
  mensagem: string,
  valorTotal: number,
): CabecalhoNfe {
  return {
    status,
    chave_acesso: null,
    numero: null,
    serie: null,
    protocolo_autorizacao: null,
    xml_url: null,
    danfe_url: null,
    data_emissao: new Date(),
    mensagem_sefaz: mensagem.slice(0, 2000),
    valor_total: arredondarDinheiro(valorTotal),
    valor_icms: 0,
    valor_ipi: 0,
    valor_pis: 0,
    valor_cofins: 0,
  };
}

async function proximoNumeroNfe(numeroAtual: number | null) {
  if (numeroAtual != null) return numeroAtual;
  const ultimo = await prisma.nfe.aggregate({ _max: { numero: true } });
  return (ultimo._max.numero ?? 0) + 1;
}

function deveConsultarNotaExistente(http: number, json: RespostaFocusNfce) {
  const codigo = (json.codigo ?? "").toLowerCase();
  return (
    http === 422 &&
    (codigo === "already_processed" ||
      codigo === "nfe_autorizada" ||
      codigo === "pending_operation")
  );
}

function mapearRespostaFocus(
  json: RespostaFocusNfce,
  http: number,
  ambiente: ReturnType<typeof ambienteFocusNfe>,
): Omit<
  CabecalhoNfe,
  "valor_total" | "valor_icms" | "valor_ipi" | "valor_pis" | "valor_cofins"
> {
  const statusFocus = (json.status ?? "").toLowerCase();

  if (statusFocus === "autorizado") {
    return {
      status: json.contingencia_offline ? "contingencia" : "autorizada",
      chave_acesso: chaveAcesso44(json.chave_nfe),
      numero: numeroOpcional(json.numero),
      serie: numeroOpcional(json.serie),
      protocolo_autorizacao: protocoloAutorizacao(json),
      xml_url: urlArquivoFocus(json.caminho_xml_nota_fiscal, ambiente),
      danfe_url: urlArquivoFocus(json.caminho_danfe, ambiente),
      data_emissao: new Date(),
      mensagem_sefaz: json.mensagem_sefaz?.slice(0, 2000) ?? null,
    };
  }

  if (statusFocus === "erro_autorizacao") {
    return {
      status: "rejeitada",
      chave_acesso: null,
      numero: numeroOpcional(json.numero),
      serie: numeroOpcional(json.serie),
      protocolo_autorizacao: null,
      xml_url: null,
      danfe_url: null,
      data_emissao: new Date(),
      mensagem_sefaz: mensagemErroFocus(json, http),
    };
  }

  if (statusFocus === "cancelado") {
    return {
      status: "cancelada",
      chave_acesso: chaveAcesso44(json.chave_nfe),
      numero: numeroOpcional(json.numero),
      serie: numeroOpcional(json.serie),
      protocolo_autorizacao: protocoloAutorizacao(json),
      xml_url: urlArquivoFocus(json.caminho_xml_nota_fiscal, ambiente),
      danfe_url: urlArquivoFocus(json.caminho_danfe, ambiente),
      data_emissao: new Date(),
      mensagem_sefaz: json.mensagem_sefaz?.slice(0, 2000) ?? null,
    };
  }

  return {
    status: "pendente",
    chave_acesso: chaveAcesso44(json.chave_nfe),
    numero: numeroOpcional(json.numero),
    serie: numeroOpcional(json.serie),
    protocolo_autorizacao: null,
    xml_url: null,
    danfe_url: null,
    data_emissao: new Date(),
    mensagem_sefaz: mensagemErroFocus(json, http),
  };
}

async function gravarNfe(
  vendaId: number,
  params: {
    cabecalho: CabecalhoNfe;
    itens: ItemCalculado[];
    clienteId?: number | null;
  },
) {
  const { cabecalho, itens } = params;
  await prisma.$transaction(async (tx) => {
    const nota = await tx.nfe.upsert({
      where: { venda_id: vendaId },
      create: {
        venda_id: vendaId,
        cliente_id: params.clienteId ?? null,
        ...cabecalho,
      },
      update: {
        cliente_id: params.clienteId ?? null,
        ...cabecalho,
      },
    });
    await tx.nfe_item.deleteMany({ where: { nfe_id: nota.id } });
    if (itens.length === 0) return;
    await tx.nfe_item.createMany({
      data: itens.map((item) => ({
        nfe_id: nota.id,
        produto_id: item.produto_id,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        ncm: item.ncm,
        cfop: item.cfop,
        origem_mercadoria: item.origem_mercadoria || null,
        cst_csosn: item.cst_csosn,
        aliquota_icms: item.aliquota_icms,
        valor_icms: item.valor_icms,
        aliquota_ipi: item.aliquota_ipi,
        valor_ipi: item.valor_ipi,
        aliquota_pis: item.aliquota_pis,
        valor_pis: item.valor_pis,
        aliquota_cofins: item.aliquota_cofins,
        valor_cofins: item.valor_cofins,
      })),
    });
  });
}
