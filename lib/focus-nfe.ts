import { arredondarDinheiro } from "@/lib/dinheiro";
import { soDigitos } from "@/lib/documento";

/** NCM genérico de preparação alimentícia até o produto ter campo fiscal próprio. */
export const NCM_PADRAO_NFCE = "21069090";
export const CFOP_VENDA_INTERNA = "5102";
export const ICMS_SIMPLES_102 = "102";

export type AmbienteFocus = "homologacao" | "producao";

export type ItemParaNfce = {
  codigo: string;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  subtotal: number;
  unidade: string;
};

export type PagamentoParaNfce = {
  tipo: string;
  valor: number;
  troco: number;
};

export type DestinatarioNfce = {
  nome: string | null;
  cpf: string | null;
};

export type EmitenteNfce = {
  cnpj: string;
  razao_social: string;
};

export function tokenFocusNfe() {
  return (process.env.FOCUS_NFE_TOKEN ?? "").trim();
}

export function ambienteFocusNfe(): AmbienteFocus {
  const bruto = (process.env.FOCUS_NFE_AMBIENTE ?? "homologacao")
    .trim()
    .toLowerCase();
  if (bruto === "producao" || bruto === "produção" || bruto === "production") {
    return "producao";
  }
  return "homologacao";
}

export function origemFocusNfe(ambiente: AmbienteFocus) {
  return ambiente === "producao"
    ? "https://api.focusnfe.com.br"
    : "https://homologacao.focusnfe.com.br";
}

export function referenciaNfce(vendaId: number) {
  return `venda-${vendaId}`;
}

/**
 * Focus NFe autentica com HTTP Basic: token como usuário e senha vazia.
 * Não é Bearer — ver https://doc.focusnfe.com.br/reference/autenticacao.md
 */
export function cabecalhoAuthFocus(token: string) {
  const basic = Buffer.from(`${token}:`).toString("base64");
  return {
    Authorization: `Basic ${basic}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export function formatarDataEmissaoIso(data = new Date()) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  });
  const partes = Object.fromEntries(
    dtf.formatToParts(data).map((parte) => [parte.type, parte.value]),
  );
  const offset =
    (partes.timeZoneName ?? "GMT-03:00").replace(/^GMT/i, "") || "-03:00";
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}${offset}`;
}

export function codigoFormaPagamentoNfce(tipo: string) {
  switch (tipo) {
    case "dinheiro":
      return "01";
    case "credito":
      return "03";
    case "debito":
      return "04";
    case "pix":
      return "17";
    case "fiado":
      return "05";
    default:
      return "99";
  }
}

export function montarPayloadNfce(params: {
  emitente: EmitenteNfce;
  destinatario?: DestinatarioNfce | null;
  itens: ItemParaNfce[];
  pagamentos: PagamentoParaNfce[];
  dataEmissao?: Date;
}) {
  const items = params.itens.map((item, indice) => {
    const quantidade = Number(item.quantidade);
    const unitario = Number(item.preco_unitario);
    const desconto = arredondarDinheiro(Number(item.desconto) || 0);
    const valorBruto = arredondarDinheiro(
      Number(item.subtotal) + desconto || quantidade * unitario,
    );
    const unidade = item.unidade.trim() || "UN";
    return {
      numero_item: String(indice + 1),
      codigo_ncm: NCM_PADRAO_NFCE,
      codigo_produto: item.codigo.slice(0, 60) || String(indice + 1),
      descricao: item.descricao.slice(0, 120),
      quantidade_comercial: quantidade,
      quantidade_tributavel: quantidade,
      cfop: CFOP_VENDA_INTERNA,
      valor_unitario_comercial: unitario,
      valor_unitario_tributavel: unitario,
      valor_bruto: valorBruto,
      ...(desconto > 0 ? { valor_desconto: desconto } : {}),
      unidade_comercial: unidade,
      unidade_tributavel: unidade,
      icms_origem: "0",
      icms_situacao_tributaria: ICMS_SIMPLES_102,
    };
  });

  const formas_pagamento = params.pagamentos.map((pagamento) => {
    const valor = arredondarDinheiro(
      Number(pagamento.valor) - Number(pagamento.troco || 0),
    );
    const corpo: Record<string, string | number> = {
      forma_pagamento: codigoFormaPagamentoNfce(pagamento.tipo),
      valor_pagamento: valor > 0 ? valor : 0,
    };
    if (pagamento.tipo === "credito" || pagamento.tipo === "debito") {
      corpo.tipo_integracao = "2";
    }
    return corpo;
  });

  const payload: Record<string, unknown> = {
    cnpj_emitente: soDigitos(params.emitente.cnpj),
    nome_emitente: params.emitente.razao_social,
    data_emissao: formatarDataEmissaoIso(params.dataEmissao),
    presenca_comprador: "1",
    modalidade_frete: "9",
    local_destino: "1",
    natureza_operacao: "VENDA AO CONSUMIDOR",
    indicador_inscricao_estadual_destinatario: "9",
    items,
    formas_pagamento,
  };

  const cpf = soDigitos(params.destinatario?.cpf ?? "");
  if (cpf.length === 11) {
    payload.cpf_destinatario = cpf;
    if (params.destinatario?.nome) {
      payload.nome_destinatario = params.destinatario.nome;
    }
  }

  return payload;
}

export type RespostaFocusNfce = {
  status?: string;
  status_sefaz?: string;
  mensagem_sefaz?: string;
  chave_nfe?: string;
  numero?: string | number;
  serie?: string | number;
  caminho_xml_nota_fiscal?: string;
  caminho_danfe?: string;
  codigo?: string;
  mensagem?: string;
  erros?: { mensagem?: string; campo?: string }[];
  contingencia_offline?: boolean;
  protocolo_nota_fiscal?: { nProt?: string; numero?: string };
  numero_protocolo?: string;
  protocolo?: string;
};

export async function postarNfceFocus(params: {
  token: string;
  ambiente: AmbienteFocus;
  ref: string;
  payload: Record<string, unknown>;
}) {
  const origem = origemFocusNfe(params.ambiente);
  const url = `${origem}/v2/nfce?ref=${encodeURIComponent(params.ref)}&completa=1`;
  return chamarFocus(url, {
    method: "POST",
    headers: cabecalhoAuthFocus(params.token),
    body: JSON.stringify(params.payload),
  });
}

export async function consultarNfceFocus(params: {
  token: string;
  ambiente: AmbienteFocus;
  ref: string;
}) {
  const origem = origemFocusNfe(params.ambiente);
  const url = `${origem}/v2/nfce/${encodeURIComponent(params.ref)}?completa=1`;
  return chamarFocus(url, {
    method: "GET",
    headers: cabecalhoAuthFocus(params.token),
  });
}

export function referenciaNfe(vendaId: number) {
  return `nfe-venda-${vendaId}`;
}

export type ItemParaNfe = ItemParaNfce & {
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
};

export type DestinatarioNfe = {
  razao_social: string | null;
  nome: string;
  cnpj: string | null;
  inscricao_estadual: string | null;
  endereco: string | null;
};

function situacaoPisCofins(aliquota: number) {
  return aliquota > 0 ? "01" : "07";
}

function situacaoIpi(aliquota: number) {
  return aliquota > 0 ? "50" : "99";
}

export function montarPayloadNfe(params: {
  emitente: EmitenteNfce;
  destinatario: DestinatarioNfe;
  itens: ItemParaNfe[];
  pagamentos: PagamentoParaNfce[];
  totais: {
    valor_produtos: number;
    valor_icms: number;
    valor_ipi: number;
    valor_pis: number;
    valor_cofins: number;
    valor_total: number;
  };
  dataEmissao?: Date;
}) {
  const items = params.itens.map((item, indice) => {
    const quantidade = Number(item.quantidade);
    const unitario = Number(item.preco_unitario);
    const desconto = arredondarDinheiro(Number(item.desconto) || 0);
    const valorBruto = arredondarDinheiro(
      Number(item.subtotal) + desconto || quantidade * unitario,
    );
    const unidade = item.unidade.trim() || "UN";
    const cst = item.cst_csosn.trim();
    const corpo: Record<string, string | number> = {
      numero_item: String(indice + 1),
      codigo_ncm: item.ncm,
      codigo_produto: item.codigo.slice(0, 60) || String(indice + 1),
      descricao: item.descricao.slice(0, 120),
      quantidade_comercial: quantidade,
      quantidade_tributavel: quantidade,
      cfop: item.cfop,
      valor_unitario_comercial: unitario,
      valor_unitario_tributavel: unitario,
      valor_bruto: valorBruto,
      unidade_comercial: unidade,
      unidade_tributavel: unidade,
      inclui_no_total: "1",
      icms_origem: item.origem_mercadoria,
      icms_situacao_tributaria: cst,
      icms_aliquota: item.aliquota_icms,
      icms_base_calculo: item.subtotal,
      icms_valor: item.valor_icms,
      ipi_situacao_tributaria: situacaoIpi(item.aliquota_ipi),
      ipi_aliquota: item.aliquota_ipi,
      ipi_valor: item.valor_ipi,
      pis_situacao_tributaria: situacaoPisCofins(item.aliquota_pis),
      pis_aliquota_porcentual: item.aliquota_pis,
      pis_valor: item.valor_pis,
      cofins_situacao_tributaria: situacaoPisCofins(item.aliquota_cofins),
      cofins_aliquota_porcentual: item.aliquota_cofins,
      cofins_valor: item.valor_cofins,
    };
    if (desconto > 0) corpo.valor_desconto = desconto;
    if (item.aliquota_ipi > 0) {
      corpo.ipi_codigo_enquadramento_legal = "999";
    }
    return corpo;
  });

  const formas_pagamento = params.pagamentos.map((pagamento) => {
    const valor = arredondarDinheiro(
      Number(pagamento.valor) - Number(pagamento.troco || 0),
    );
    const corpo: Record<string, string | number> = {
      forma_pagamento: codigoFormaPagamentoNfce(pagamento.tipo),
      valor_pagamento: valor > 0 ? valor : 0,
    };
    if (pagamento.tipo === "credito" || pagamento.tipo === "debito") {
      corpo.tipo_integracao = "2";
    }
    return corpo;
  });

  const cnpjDest = soDigitos(params.destinatario.cnpj ?? "");
  const ie = (params.destinatario.inscricao_estadual ?? "").trim();
  const endereco = (params.destinatario.endereco ?? "").trim();
  const payload: Record<string, unknown> = {
    cnpj_emitente: soDigitos(params.emitente.cnpj),
    nome_emitente: params.emitente.razao_social,
    data_emissao: formatarDataEmissaoIso(params.dataEmissao),
    tipo_documento: "1",
    local_destino: "1",
    finalidade_emissao: "1",
    consumidor_final: "0",
    presenca_comprador: "1",
    modalidade_frete: "9",
    natureza_operacao: "VENDA",
    cnpj_destinatario: cnpjDest,
    nome_destinatario:
      params.destinatario.razao_social?.trim() || params.destinatario.nome,
    indicador_inscricao_estadual_destinatario: ie ? "1" : "9",
    valor_produtos: params.totais.valor_produtos,
    valor_ipi: params.totais.valor_ipi,
    valor_pis: params.totais.valor_pis,
    valor_cofins: params.totais.valor_cofins,
    icms_valor_total: params.totais.valor_icms,
    valor_total: params.totais.valor_total,
    items,
    formas_pagamento,
  };
  if (ie) payload.inscricao_estadual_destinatario = ie;
  if (endereco) {
    payload.logradouro_destinatario = endereco.slice(0, 60);
    payload.numero_destinatario = "S/N";
  }
  return payload;
}

export async function postarNfeFocus(params: {
  token: string;
  ambiente: AmbienteFocus;
  ref: string;
  payload: Record<string, unknown>;
}) {
  const origem = origemFocusNfe(params.ambiente);
  const url = `${origem}/v2/nfe?ref=${encodeURIComponent(params.ref)}&completa=1`;
  return chamarFocus(url, {
    method: "POST",
    headers: cabecalhoAuthFocus(params.token),
    body: JSON.stringify(params.payload),
  });
}

export async function consultarNfeFocus(params: {
  token: string;
  ambiente: AmbienteFocus;
  ref: string;
}) {
  const origem = origemFocusNfe(params.ambiente);
  const url = `${origem}/v2/nfe/${encodeURIComponent(params.ref)}?completa=1`;
  return chamarFocus(url, {
    method: "GET",
    headers: cabecalhoAuthFocus(params.token),
  });
}

async function chamarFocus(url: string, init: RequestInit) {
  const resposta = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });
  const texto = await resposta.text();
  let json: RespostaFocusNfce = {};
  if (texto) {
    try {
      json = JSON.parse(texto) as RespostaFocusNfce;
    } catch {
      json = { mensagem: texto.slice(0, 400) };
    }
  }
  return { http: resposta.status, json };
}

export function chaveAcesso44(chave: string | undefined | null) {
  const digits = String(chave ?? "")
    .replace(/^NFe/i, "")
    .replace(/\D/g, "");
  return digits.length === 44 ? digits : null;
}

export function urlArquivoFocus(
  caminho: string | undefined | null,
  ambiente: AmbienteFocus,
) {
  if (!caminho) return null;
  const absoluto =
    caminho.startsWith("http://") || caminho.startsWith("https://")
      ? caminho
      : `${origemFocusNfe(ambiente)}${caminho.startsWith("/") ? "" : "/"}${caminho}`;
  return absoluto.slice(0, 255);
}

export function numeroOpcional(valor: string | number | undefined | null) {
  if (valor == null || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function protocoloAutorizacao(json: RespostaFocusNfce) {
  const direto =
    json.protocolo ??
    json.numero_protocolo ??
    json.protocolo_nota_fiscal?.nProt ??
    json.protocolo_nota_fiscal?.numero;
  if (typeof direto === "string" && direto.trim()) {
    return direto.trim().slice(0, 50);
  }
  return null;
}

export function mensagemErroFocus(json: RespostaFocusNfce, http: number) {
  const detalhes = (json.erros ?? [])
    .map((erro) => erro.mensagem)
    .filter(Boolean)
    .join("; ");
  const base =
    json.mensagem_sefaz ||
    json.mensagem ||
    detalhes ||
    `Falha na comunicação com o Focus NFe (HTTP ${http}).`;
  return base.slice(0, 2000);
}
