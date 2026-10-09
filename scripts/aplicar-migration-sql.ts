import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { sanitizarErroBanco } from "../lib/banco-teste";

function nomeArquivo(argv: string[]) {
  for (const arg of argv) {
    if (arg.startsWith("--arquivo=")) return arg.slice("--arquivo=".length);
  }
  return "";
}

async function main() {
  const arquivo = nomeArquivo(process.argv.slice(2));
  const confirmo = process.argv.includes("--confirmo");
  if (!arquivo || arquivo.includes("..") || arquivo.includes("/") || arquivo.includes("\\")) {
    throw new Error("Use --arquivo=031_cancelar_pedido.sql");
  }
  const caminho = path.join(process.cwd(), "database", "migrations", arquivo);
  const sql = await readFile(caminho, "utf8");
  console.log(`=== ${confirmo ? "APLICAR" : "DRY-RUN"} ${arquivo} ===\n`);
  console.log(sql);
  if (!confirmo) {
    console.log("\nNenhum SQL executado. Passe --confirmo para aplicar.");
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não está definida.");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`\nOK: ${arquivo} aplicada.`);
  } finally {
    await client.end();
  }
}

main().catch((erro) => {
  console.error(sanitizarErroBanco(erro));
  process.exit(1);
});
