import type { Config } from "@netlify/functions";
import { dispararKeepalive } from "../../lib/keepalive-cliente";

/** 10:56 UTC = 07:56 America/Sao_Paulo, segunda a sábado. */
export const config: Config = {
  schedule: "56 10 * * 1-6",
};

export default async () => {
  try {
    await dispararKeepalive({
      url: process.env.URL,
      token: process.env.KEEPALIVE_TOKEN,
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.warn("[keepalive-abertura]", mensagem);
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
