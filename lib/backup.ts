import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStore } from "@netlify/blobs";
import { Client } from "pg";

export const STORE_BACKUPS = "backups";
export const MANTER_BACKUPS = 8;
export const PREFIXO_BACKUP = "backup-";

const CHAVE_BACKUP = /^backup-\d{4}-\d{2}-\d{2}\.json$/;
const TABELA_SEGURA = /^[a-zA-Z0-9_]+$/;
const DIR_LOCAL = path.join(process.cwd(), ".netlify", "blobs-backups");

export type ItemBackup = {
  chave: string;
  bytes: number;
};

export type ResultadoBackup = {
  chave: string;
  tabelas: number;
  linhas: number;
  bytes: number;
  removidos: string[];
  destino: "blobs" | "local";
};

export function chaveBackup(quando: Date = new Date()) {
  const yyyy = quando.getUTCFullYear();
  const mm = String(quando.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(quando.getUTCDate()).padStart(2, "0");
  return `${PREFIXO_BACKUP}${yyyy}-${mm}-${dd}.json`;
}

export function ehChaveBackup(chave: string) {
  return CHAVE_BACKUP.test(chave);
}

export function formatarTamanhoBackup(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function usarBlobsRemotos() {
  const token =
    process.env.NETLIFY_AUTH_TOKEN ||
    process.env.NETLIFY_TOKEN ||
    "";
  return Boolean(
    process.env.NETLIFY_BLOBS_CONTEXT ||
      process.env.NETLIFY ||
      (process.env.NETLIFY_SITE_ID && token),
  );
}

function storeRemoto() {
  const siteID = process.env.NETLIFY_SITE_ID ?? "";
  const token =
    process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_TOKEN || "";
  if (siteID && token) {
    return getStore({
      name: STORE_BACKUPS,
      siteID,
      token,
      consistency: "strong",
    });
  }
  return getStore({ name: STORE_BACKUPS, consistency: "strong" });
}

function jsonReplacer(_chave: string, valor: unknown) {
  if (typeof valor === "bigint") return valor.toString();
  if (Buffer.isBuffer(valor)) {
    return { $bytes: valor.toString("base64") };
  }
  return valor;
}

async function exportarTodasTabelas(client: Client) {
  const tabelas = await client.query<{ tablename: string }>(
    `SELECT tablename
       FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename`,
  );

  const dados: Record<string, unknown[]> = {};
  let linhas = 0;

  for (const { tablename } of tabelas.rows) {
    if (!TABELA_SEGURA.test(tablename)) continue;
    const resultado = await client.query(
      `SELECT * FROM "${tablename.replace(/"/g, '""')}"`,
    );
    dados[tablename] = resultado.rows;
    linhas += resultado.rows.length;
  }

  return {
    gerado_em: new Date().toISOString(),
    tabelas: dados,
    linhas,
    qtd_tabelas: Object.keys(dados).length,
  };
}

async function gravarLocal(chave: string, json: string) {
  await mkdir(DIR_LOCAL, { recursive: true });
  await writeFile(path.join(DIR_LOCAL, chave), json, "utf8");
}

async function listarLocal(): Promise<ItemBackup[]> {
  try {
    const nomes = await readdir(DIR_LOCAL);
    const itens: ItemBackup[] = [];
    for (const nome of nomes) {
      if (!ehChaveBackup(nome)) continue;
      const info = await stat(path.join(DIR_LOCAL, nome));
      itens.push({ chave: nome, bytes: info.size });
    }
    return itens.sort((a, b) => b.chave.localeCompare(a.chave));
  } catch {
    return [];
  }
}

async function lerLocal(chave: string) {
  try {
    return await readFile(path.join(DIR_LOCAL, chave), "utf8");
  } catch {
    return null;
  }
}

async function apagarLocal(chave: string) {
  try {
    await unlink(path.join(DIR_LOCAL, chave));
  } catch {
    /* já inexistente */
  }
}

async function listarChavesRemotas() {
  const store = storeRemoto();
  const chaves: string[] = [];
  for await (const pagina of store.list({
    prefix: PREFIXO_BACKUP,
    paginate: true,
  })) {
    for (const blob of pagina.blobs) {
      if (ehChaveBackup(blob.key)) chaves.push(blob.key);
    }
  }
  return chaves.sort().reverse();
}

async function podar(chaves: string[], apagar: (chave: string) => Promise<void>) {
  const removidos: string[] = [];
  for (const chave of chaves.slice(MANTER_BACKUPS)) {
    await apagar(chave);
    removidos.push(chave);
  }
  return removidos;
}

export async function executarBackupSemanal(
  quando: Date = new Date(),
): Promise<ResultadoBackup> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não está definida.");
  }

  const chave = chaveBackup(quando);
  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    const exportacao = await exportarTodasTabelas(client);
    const json = JSON.stringify(
      {
        gerado_em: exportacao.gerado_em,
        tabelas: exportacao.tabelas,
      },
      jsonReplacer,
    );
    const bytes = Buffer.byteLength(json, "utf8");
    const destino = usarBlobsRemotos() ? "blobs" : "local";

    if (destino === "blobs") {
      const store = storeRemoto();
      await store.set(chave, json, {
        metadata: { bytes, gerado_em: exportacao.gerado_em },
      });
      const chaves = await listarChavesRemotas();
      const removidos = await podar(chaves, async (antiga) => {
        await store.delete(antiga);
      });
      return {
        chave,
        tabelas: exportacao.qtd_tabelas,
        linhas: exportacao.linhas,
        bytes,
        removidos,
        destino,
      };
    }

    await gravarLocal(chave, json);
    const locais = await listarLocal();
    const removidos = await podar(
      locais.map((item) => item.chave),
      apagarLocal,
    );
    return {
      chave,
      tabelas: exportacao.qtd_tabelas,
      linhas: exportacao.linhas,
      bytes,
      removidos,
      destino,
    };
  } finally {
    await client.end();
  }
}

export async function listarBackups(): Promise<ItemBackup[]> {
  if (!usarBlobsRemotos()) {
    return listarLocal();
  }

  try {
    const store = storeRemoto();
    const chaves = await listarChavesRemotas();
    const itens: ItemBackup[] = [];
    for (const chave of chaves) {
      const meta = await store.getMetadata(chave);
      const bruto = meta?.metadata?.bytes;
      const bytes =
        typeof bruto === "number"
          ? bruto
          : typeof bruto === "string"
            ? Number(bruto)
            : 0;
      itens.push({
        chave,
        bytes: Number.isFinite(bytes) ? bytes : 0,
      });
    }
    return itens;
  } catch (erro) {
    console.error(
      "[backup] falha ao listar blobs:",
      erro instanceof Error ? erro.message : erro,
    );
    return listarLocal();
  }
}

export async function obterBackup(chave: string): Promise<string | null> {
  if (!ehChaveBackup(chave)) return null;

  if (!usarBlobsRemotos()) {
    return lerLocal(chave);
  }

  try {
    const store = storeRemoto();
    const texto = await store.get(chave, { type: "text" });
    return texto ?? null;
  } catch (erro) {
    console.error(
      "[backup] falha ao ler blob:",
      erro instanceof Error ? erro.message : erro,
    );
    return lerLocal(chave);
  }
}
