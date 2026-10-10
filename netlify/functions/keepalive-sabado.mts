import type { Config } from "@netlify/functions";
import { dispararKeepalive } from "../../lib/keepalive-cliente";

// A cada 4 min, 11:00–16:56 UTC = 08:00–13:56 America/Sao_Paulo, sábado.
export const config: Config = {
  schedule: "*/4 11-16 * * 6",
};

export default async () => {
  try {
    await dispararKeepalive({
      url: process.env.URL,
      token: process.env.KEEPALIVE_TOKEN,
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.warn("[keepalive-sabado]", mensagem);
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
