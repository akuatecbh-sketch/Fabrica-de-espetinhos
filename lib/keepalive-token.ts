import { createHash, timingSafeEqual } from "node:crypto";

export const CABECALHO_KEEPALIVE = "x-keepalive-token";

function hashToken(valor: string) {
  return createHash("sha256").update(valor, "utf8").digest();
}

/** Compara o token em tempo constante (via SHA-256). Sem token esperado: recusa. */
export function tokenKeepaliveValido(
  recebido: string | null | undefined,
  esperado: string | undefined,
) {
  if (!esperado) return false;
  const a = hashToken(String(recebido ?? ""));
  const b = hashToken(esperado);
  return timingSafeEqual(a, b);
}
