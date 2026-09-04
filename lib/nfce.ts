import { revalidatePath } from "next/cache";
import {
  ambienteFocusNfe,
  chaveAcesso44,
  consultarNfceFocus,
  mensagemErroFocus,
  montarPayloadNfce,
  numeroOpcional,
  postarNfceFocus,
  protocoloAutorizacao,
  referenciaNfce,
  tokenFocusNfe,
  urlArquivoFocus,
  type RespostaFocusNfce,
} from "@/lib/focus-nfe";
import { prisma } from "@/lib/prisma";
import { soDigitos } from "@/lib/documento";

const MENSAGEM_SIMULADA =
  "Emissão simulada — configure FOCUS_NFE_TOKEN no .env para emitir de verdade";

type DadosNfce = {
  status: string;
  chave_acesso: string | null;
  numero: number | null;
  serie: number | null;
  protocolo_autorizacao: string | null;
  xml_url: string | null;
  danfe_url: string | null;
  data_emissao: Date | null;
  mensagem_sefaz: string | null;
};

/**
 * Emite (ou simula) a NFC-e de uma venda já finalizada.
 * Nunca lança: falhas só gravam status em `nfce`. Não altera venda, estoque nem caixa.
 */
export async function emitirNfce(vendaId: number): Promise<void> {
  try {
    await emitirNfceInterno(vendaId);
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Falha inesperada ao emitir a NFC-e.";
    try {
      await gravarNfce(vendaId, {
        status: "pendente",
        chave_acesso: null,
        numero: null,
        serie: null,
        protocolo_autorizacao: null,
        xml_url: null,
        danfe_url: null,
        data_emissao: null,
        mensagem_sefaz: mensagem.slice(0, 2000),
      });
    } catch (gravacao) {
      console.error("NFC-e: falha ao gravar status após erro", vendaId, gravacao);
    }
  } finally {
    try {
      revalidatePath("/vendas/hoje");
    } catch {
      /* revalidate é opcional no after() */
    }
  }
}

async function emitirNfceInterno(vendaId: number) {
  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: {
      cliente: { select: { nome: true, cpf: true } },
      venda_item: {
        orderBy: { id: "asc" },
        include: {
          produto: {
            select: {
              id: true,
              codigo: true,
              nome: true,
              unidade_medida: { select: { sigla: true } },
            },
          },
        },
      },
      venda_pagamento: {
        where: { status: "confirmado" },
        include: { forma_pagamento: { select: { tipo: true } } },
        orderBy: { id: "asc" },
      },
      nfce: true,
    },
  });

  if (!venda || venda.status !== "finalizada") return;
  if (venda.nfce?.status === "autorizada") return;

  const token = tokenFocusNfe();
  if (!token) {
    await gravarNfce(vendaId, {
      status: "simulado",
      chave_acesso: null,
      numero: null,
      serie: null,
      protocolo_autorizacao: null,
      xml_url: null,
      danfe_url: null,
      data_emissao: new Date(),
      mensagem_sefaz: MENSAGEM_SIMULADA,
    });
    return;
  }

  const empresa = await prisma.empresa.findUnique({ where: { id: 1 } });
  const cnpj = soDigitos(empresa?.cnpj ?? "");
  if (!empresa || cnpj.length !== 14) {
    await gravarNfce(vendaId, {
      status: "pendente",
      chave_acesso: null,
      numero: null,
      serie: null,
      protocolo_autorizacao: null,
      xml_url: null,
      danfe_url: null,
      data_emissao: null,
      mensagem_sefaz:
        "Cadastre o CNPJ da empresa (menu Empresa) para emitir a NFC-e de verdade.",
    });
    return;
  }

  if (venda.venda_item.length === 0) {
    await gravarNfce(vendaId, {
      status: "pendente",
      chave_acesso: null,
      numero: null,
      serie: null,
      protocolo_autorizacao: null,
      xml_url: null,
      danfe_url: null,
      data_emissao: null,
      mensagem_sefaz: "A venda não tem itens para emitir a NFC-e.",
    });
    return;
  }

  const ambiente = ambienteFocusNfe();
  const ref = referenciaNfce(venda.id);
  const payload = montarPayloadNfce({
    emitente: { cnpj, razao_social: empresa.razao_social },
    destinatario: venda.cliente,
    itens: venda.venda_item.map((item) => ({
      codigo: item.produto.codigo?.trim() || String(item.produto.id),
      descricao: item.produto.nome,
      quantidade: Number(item.quantidade),
      preco_unitario: Number(item.preco_unitario),
      desconto: Number(item.desconto),
      subtotal: Number(item.subtotal),
      unidade: item.produto.unidade_medida.sigla,
    })),
    pagamentos: venda.venda_pagamento.map((pagamento) => ({
      tipo: pagamento.forma_pagamento.tipo,
      valor: Number(pagamento.valor),
      troco: Number(pagamento.troco ?? 0),
    })),
  });

  let http: number;
  let json: RespostaFocusNfce;
  try {
    ({ http, json } = await postarNfceFocus({ token, ambiente, ref, payload }));
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? `Falha de comunicação com o Focus NFe: ${erro.message}`
        : "Falha de comunicação com o Focus NFe.";
    await gravarNfce(vendaId, pendenteCom(mensagem));
    return;
  }

  if (deveConsultarNotaExistente(http, json)) {
    try {
      ({ http, json } = await consultarNfceFocus({ token, ambiente, ref }));
    } catch (erro) {
      const mensagem =
        erro instanceof Error
          ? `Nota já enviada; falha ao consultar: ${erro.message}`
          : "Nota já enviada; falha ao consultar o Focus NFe.";
      await gravarNfce(vendaId, pendenteCom(mensagem));
      return;
    }
  }

  await gravarNfce(vendaId, mapearRespostaFocus(json, http, ambiente));
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

function pendenteCom(mensagem: string): DadosNfce {
  return {
    status: "pendente",
    chave_acesso: null,
    numero: null,
    serie: null,
    protocolo_autorizacao: null,
    xml_url: null,
    danfe_url: null,
    data_emissao: null,
    mensagem_sefaz: mensagem.slice(0, 2000),
  };
}

function mapearRespostaFocus(
  json: RespostaFocusNfce,
  http: number,
  ambiente: ReturnType<typeof ambienteFocusNfe>,
): DadosNfce {
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

  if (http >= 500 || http === 401 || http === 403 || http === 408 || http === 429) {
    return pendenteCom(mensagemErroFocus(json, http));
  }

  if (http >= 400) {
    const codigo = (json.codigo ?? "").toLowerCase();
    if (codigo === "pending_operation") {
      return pendenteCom(mensagemErroFocus(json, http));
    }
    return pendenteCom(mensagemErroFocus(json, http));
  }

  return pendenteCom(mensagemErroFocus(json, http));
}

async function gravarNfce(vendaId: number, dados: DadosNfce) {
  await prisma.nfce.upsert({
    where: { venda_id: vendaId },
    create: { venda_id: vendaId, ...dados },
    update: dados,
  });
}
