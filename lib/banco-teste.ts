import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

export type AlvoPostgres = {
  host: string;
  database: string;
  endpointId: string;
};

const CHAVE_TESTE = "TEST_DATABASE_URL";
const ARQUIVO_TESTE = ".env.test";
const ARQUIVOS_PROD = [".env", ".env.local"] as const;

export function sanitizarErroBanco(erro: unknown) {
  const texto = erro instanceof Error ? erro.message : String(erro);
  return texto.replace(/postgres(?:ql)?:\/\/\S+/gi, "[url omitida]");
}

export function parseAlvoPostgres(url: string): AlvoPostgres {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("URL de banco inválida.");
  }
  if (!/^postgres(?:ql)?:$/i.test(parsed.protocol)) {
    throw new Error("URL de banco inválida.");
  }
  const host = (parsed.hostname ?? "").trim().toLowerCase();
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""))
    .trim()
    .toLowerCase();
  if (!host || !database) {
    throw new Error("URL de banco sem host ou nome.");
  }
  const endpointId = host.split(".")[0] ?? host;
  return { host, database, endpointId };
}

export function endpointBate(informado: string, alvo: AlvoPostgres) {
  const flag = informado.trim().toLowerCase();
  if (!flag) return false;
  return (
    alvo.host === flag ||
    alvo.host.startsWith(`${flag}.`) ||
    alvo.endpointId === flag
  );
}

function parseLinhasEnv(texto: string) {
  const pares: { chave: string; valor: string }[] = [];
  for (const bruta of texto.split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha || linha.startsWith("#")) continue;
    const eq = linha.indexOf("=");
    if (eq <= 0) continue;
    const chave = linha.slice(0, eq).trim();
    let valor = linha.slice(eq + 1).trim();
    if (
      (valor.startsWith("\"") && valor.endsWith("\"")) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    pares.push({ chave, valor });
  }
  return pares;
}

function lerParesEnv(arquivo: string) {
  const cheio = path.join(process.cwd(), arquivo);
  if (!existsSync(cheio)) return [];
  return parseLinhasEnv(readFileSync(cheio, "utf8"));
}

function ehUrlPostgres(valor: string) {
  return /^postgres(?:ql)?:\/\//i.test(valor);
}

export function lerChaveEnvTest(chave: string) {
  const pares = lerParesEnv(ARQUIVO_TESTE);
  return pares.find((p) => p.chave === chave)?.valor.trim() ?? "";
}

export function lerTestDatabaseUrl() {
  const encontrado = lerChaveEnvTest(CHAVE_TESTE);
  if (!encontrado) {
    throw new Error("TEST_DATABASE_URL ausente em .env.test.");
  }
  return encontrado;
}

export function lerEndpointTeste() {
  return lerChaveEnvTest("TEST_ENDPOINT");
}

export function existeEnvTest() {
  return existsSync(path.join(process.cwd(), ARQUIVO_TESTE));
}

export function alvosProducaoConhecidos() {
  const alvos: AlvoPostgres[] = [];
  const vistos = new Set<string>();
  for (const arquivo of ARQUIVOS_PROD) {
    for (const { chave, valor } of lerParesEnv(arquivo)) {
      if (chave === CHAVE_TESTE) continue;
      if (!ehUrlPostgres(valor)) continue;
      const alvo = parseAlvoPostgres(valor);
      const id = `${alvo.host}/${alvo.database}`;
      if (vistos.has(id)) continue;
      vistos.add(id);
      alvos.push(alvo);
    }
  }
  return alvos;
}

export function assertNaoEProducao(teste: AlvoPostgres) {
  for (const prod of alvosProducaoConhecidos()) {
    if (teste.host === prod.host && teste.database === prod.database) {
      throw new Error(
        "ABORTADO: TEST_DATABASE_URL tem o mesmo host e banco de uma URL de produção no .env.",
      );
    }
  }
}

export function assertEndpointInformado(
  informado: string,
  teste: AlvoPostgres,
) {
  if (!informado.trim()) {
    throw new Error("Informe --endpoint-teste=<id do endpoint da branch>.");
  }
  if (!endpointBate(informado, teste)) {
    throw new Error(
      "ABORTADO: --endpoint-teste não bate com o host de TEST_DATABASE_URL.",
    );
  }
  for (const prod of alvosProducaoConhecidos()) {
    if (endpointBate(informado, prod) || teste.host === prod.host) {
      throw new Error(
        "ABORTADO: o endpoint informado é o mesmo da produção.",
      );
    }
  }
}

export function criarClienteTeste(url: string) {
  return new Client({ connectionString: url });
}

export async function lerMarcaAmbiente(client: Client) {
  const existe = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'ambiente_sistema'
     ) AS exists`,
  );
  if (!existe.rows[0]?.exists) return "ausente" as const;
  const row = await client.query<{ ambiente: string }>(
    `SELECT ambiente FROM ambiente_sistema WHERE id = 1`,
  );
  const valor = row.rows[0]?.ambiente;
  if (valor === "teste") return "teste" as const;
  return "invalida" as const;
}

export async function exigirMarcaTeste(client: Client) {
  const marca = await lerMarcaAmbiente(client);
  if (marca !== "teste") {
    throw new Error(
      "ABORTADO: marca ambiente_sistema=teste ausente. Rode a primeira limpeza.",
    );
  }
  return marca;
}

export async function conectarBancoTeste(params: {
  endpointInformado: string;
  exigirMarca: boolean;
}) {
  const url = lerTestDatabaseUrl();
  const alvo = parseAlvoPostgres(url);
  assertNaoEProducao(alvo);
  assertEndpointInformado(params.endpointInformado, alvo);
  const client = criarClienteTeste(url);
  await client.connect();
  try {
    const marca = await lerMarcaAmbiente(client);
    if (params.exigirMarca) {
      if (marca !== "teste") {
        await client.end();
        throw new Error(
          "ABORTADO: marca ambiente_sistema=teste ausente. Rode a primeira limpeza.",
        );
      }
    } else if (marca === "invalida") {
      await client.end();
      throw new Error("ABORTADO: ambiente_sistema existe e não é teste.");
    }
    return { client, alvo, marca };
  } catch (erro) {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    throw erro;
  }
}
