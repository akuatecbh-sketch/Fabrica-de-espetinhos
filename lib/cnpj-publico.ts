import { soDigitos } from "@/lib/documento";

export const AVISO_CNPJ_NAO_ENCONTRADO =
  "CNPJ não encontrado na base pública — preencha manualmente";
export const AVISO_CNPJ_BUSCA_INDISPONIVEL =
  "Busca automática indisponível no momento — preencha manualmente";

export type DadosCnpjPublico = {
  razao_social: string;
  nome_fantasia: string;
  endereco: string;
  inscricao_estadual: string;
};

function limitar(valor: unknown, max: number) {
  if (valor == null) return "";
  return String(valor).replace(/\s+/g, " ").trim().slice(0, max);
}

function ehRecord(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function formatarCep(valor: string) {
  const digitos = soDigitos(valor).slice(0, 8);
  if (digitos.length !== 8) return valor.trim();
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

function montarEndereco(partes: {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
}) {
  const logradouroNumero = [partes.logradouro, partes.numero]
    .filter(Boolean)
    .join(", ");
  const comComplemento = [logradouroNumero, partes.complemento]
    .filter(Boolean)
    .join(" — ");
  const cidadeUf = [partes.municipio, partes.uf].filter(Boolean).join("/");
  const bairroCidade = [partes.bairro, cidadeUf].filter(Boolean).join(", ");
  const cep = partes.cep ? `CEP ${formatarCep(partes.cep)}` : "";
  return [comComplemento, bairroCidade, cep].filter(Boolean).join(" — ").slice(0, 255);
}

function enderecoDoPayload(payload: Record<string, unknown>) {
  const nested = ehRecord(payload.endereco) ? payload.endereco : payload;
  return montarEndereco({
    logradouro: limitar(nested.logradouro ?? payload.logradouro, 150),
    numero: limitar(nested.numero ?? payload.numero, 20),
    complemento: limitar(nested.complemento ?? payload.complemento, 80),
    bairro: limitar(nested.bairro ?? payload.bairro, 80),
    municipio: limitar(nested.municipio ?? payload.municipio, 80),
    uf: limitar(nested.uf ?? payload.uf, 2).toUpperCase(),
    cep: limitar(nested.cep ?? payload.cep, 16),
  });
}

function inscricaoAtiva(item: Record<string, unknown>) {
  return item.ativo === true || item.ativa === true;
}

function inscricaoEstadualDoPayload(payload: Record<string, unknown>) {
  const lista = Array.isArray(payload.inscricoes_estaduais)
    ? payload.inscricoes_estaduais.filter(ehRecord)
    : [];
  if (lista.length === 0) {
    return limitar(
      payload.inscricao_estadual ?? payload.ie,
      20,
    );
  }

  const uf = limitar(payload.uf, 2).toUpperCase();
  const ativas = lista.filter(inscricaoAtiva);
  const daMesmaUf = ativas.find(
    (item) => limitar(item.uf, 2).toUpperCase() === uf && uf,
  );
  const escolhida = daMesmaUf ?? ativas[0] ?? lista[0];
  return limitar(escolhida?.inscricao_estadual, 20);
}

export function mapearDadosCnpj(payload: unknown): DadosCnpjPublico | null {
  if (!ehRecord(payload)) return null;
  const razao_social = limitar(payload.razao_social, 150);
  if (!razao_social) return null;
  return {
    razao_social,
    nome_fantasia: limitar(payload.nome_fantasia, 150),
    endereco: enderecoDoPayload(payload),
    inscricao_estadual: inscricaoEstadualDoPayload(payload),
  };
}

async function lerJson(resposta: Response) {
  const texto = await resposta.text();
  if (!texto) return null;
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return null;
  }
}

async function getJson(
  url: string,
  headers: Record<string, string> = {},
) {
  const resposta = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (compatible; EspetinhosBackoffice/1.0; +https://localhost)",
      ...headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  return { status: resposta.status, ok: resposta.ok, json: await lerJson(resposta) };
}

async function consultarBrasilApi(cnpj: string): Promise<
  | { ok: true; dados: DadosCnpjPublico }
  | { ok: false; aviso: string }
> {
  try {
    const brasil = await getJson(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
    );
    if (brasil.status === 400 || brasil.status === 404) {
      return { ok: false, aviso: AVISO_CNPJ_NAO_ENCONTRADO };
    }
    if (brasil.status === 429 || !brasil.ok) {
      return { ok: false, aviso: AVISO_CNPJ_BUSCA_INDISPONIVEL };
    }
    const dados = mapearDadosCnpj(brasil.json);
    if (!dados) return { ok: false, aviso: AVISO_CNPJ_NAO_ENCONTRADO };
    return { ok: true, dados };
  } catch {
    return { ok: false, aviso: AVISO_CNPJ_BUSCA_INDISPONIVEL };
  }
}

export async function consultarDadosCnpjPublico(cnpj: string): Promise<
  | { ok: true; dados: DadosCnpjPublico }
  | { ok: false; aviso: string }
> {
  const chave = process.env.SINTEGRABRASIL_API_KEY?.trim();
  if (chave) {
    try {
      const sintegra = await getJson(
        `https://www.sintegrabrasil.com.br/api/v1/cnpj/${cnpj}`,
        { "X-Api-Key": chave },
      );
      if (sintegra.status === 400 || sintegra.status === 404) {
        return { ok: false, aviso: AVISO_CNPJ_NAO_ENCONTRADO };
      }
      if (sintegra.status === 429) {
        return { ok: false, aviso: AVISO_CNPJ_BUSCA_INDISPONIVEL };
      }
      if (sintegra.ok) {
        const dados = mapearDadosCnpj(sintegra.json);
        if (dados) return { ok: true, dados };
      }
    } catch {
      // Cai no fallback público abaixo.
    }
  }

  return consultarBrasilApi(cnpj);
}
