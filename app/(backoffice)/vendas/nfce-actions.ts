"use server";

import { emitirNfce as executarEmissao } from "@/lib/nfce";
import { exigirModulo } from "@/lib/sessao";

/**
 * Emissão independente da venda. Nunca lança — falhas só atualizam `nfce`.
 * Usada pelo PDV via after(); não redireciona.
 */
export async function emitirNfce(vendaId: number) {
  await executarEmissao(vendaId);
}

export async function tentarEmitirNfce(vendaId: number) {
  await exigirModulo("vendas");
  await executarEmissao(vendaId);
}
