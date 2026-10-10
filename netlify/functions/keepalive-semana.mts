import type { Config } from "@netlify/functions";
import { dispararKeepalive } from "../../lib/keepalive-cliente";

// A cada 4 min, 11:00–20:56 UTC = 08:00–17:56 America/Sao_Paulo, segunda a sexta.
export const config: Config = {
  schedule: "*/4 11-20 * * 1-5",
};

export default async () => {
  try {
    await dispararKeepalive({
      url: process.env.URL,
      token: process.env.KEEPALIVE_TOKEN,
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.warn("[keepalive-semana]", mensagem);
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
