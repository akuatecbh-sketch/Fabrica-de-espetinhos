import type { Config } from "@netlify/functions";
import { executarBackupSemanal } from "../../lib/backup";

export default async () => {
  try {
    const resultado = await executarBackupSemanal();
    console.log(
      "[backup-semanal] sucesso",
      JSON.stringify({
        chave: resultado.chave,
        tabelas: resultado.tabelas,
        linhas: resultado.linhas,
        bytes: resultado.bytes,
        removidos: resultado.removidos,
        destino: resultado.destino,
      }),
    );
    return new Response(JSON.stringify({ ok: true, ...resultado }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.error("[backup-semanal] erro", mensagem);
    return new Response(JSON.stringify({ ok: false, erro: mensagem }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = {
  schedule: "0 6 * * 0",
};
