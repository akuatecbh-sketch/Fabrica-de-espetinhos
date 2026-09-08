"use server";

import { emitirNfe as executarEmissao } from "@/lib/nfe";
import { exigirModulo } from "@/lib/sessao";

export async function emitirNfe(vendaId: number) {
  await exigirModulo("vendas");
  if (!Number.isInteger(vendaId) || vendaId <= 0) {
    return { error: "Nota inválida." };
  }
  return executarEmissao(vendaId);
}
