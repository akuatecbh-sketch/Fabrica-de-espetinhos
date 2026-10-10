import { estaNaJanelaKeepalive } from "@/lib/horario-comercial";
import { CABECALHO_KEEPALIVE } from "@/lib/keepalive-token";

export type ResultadoKeepalive = {
  ok: true;
  pulou?: "config" | "fora-da-janela";
};

export async function dispararKeepalive(params: {
  url?: string;
  token?: string;
  agora?: Date;
  fetchImpl?: typeof fetch;
}): Promise<ResultadoKeepalive> {
  const base = params.url?.trim().replace(/\/$/, "");
  const token = params.token?.trim();
  if (!base || !token) {
    console.warn("[keepalive] KEEPALIVE_TOKEN ou URL ausente");
    return { ok: true, pulou: "config" };
  }
  if (!estaNaJanelaKeepalive(params.agora ?? new Date())) {
    return { ok: true, pulou: "fora-da-janela" };
  }

  const fetchImpl = params.fetchImpl ?? fetch;
  const resposta = await fetchImpl(`${base}/api/keepalive`, {
    method: "GET",
    headers: {
      [CABECALHO_KEEPALIVE]: token,
      "cache-control": "no-store",
    },
  });
  if (!resposta.ok) {
    throw new Error(`keepalive HTTP ${resposta.status}`);
  }
  return { ok: true };
}
