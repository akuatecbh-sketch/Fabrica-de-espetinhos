"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  CHAVE_FORMATO_IMPRESSAO,
  ehFormatoImpressaoPedido,
  type FormatoImpressaoPedido,
} from "@/lib/pedido-impressao";

export function SeletorFormatoImpressaoPedido({
  pedidoId,
  formato,
}: {
  pedidoId: number;
  formato: FormatoImpressaoPedido;
}) {
  const router = useRouter();

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_FORMATO_IMPRESSAO, formato);
    } catch {
      /* ignore */
    }
  }, [formato]);

  function escolher(proximo: FormatoImpressaoPedido) {
    try {
      localStorage.setItem(CHAVE_FORMATO_IMPRESSAO, proximo);
    } catch {
      /* ignore */
    }
    router.replace(`/pedidos/${pedidoId}/imprimir?formato=${proximo}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      Formato
      <select
        value={formato}
        onChange={(evento) => {
          const valor = evento.target.value;
          if (ehFormatoImpressaoPedido(valor)) escolher(valor);
        }}
        className="rounded border border-zinc-300 bg-white px-3 py-2"
      >
        <option value="a4">A4</option>
        <option value="80mm">Cupom 80 mm</option>
      </select>
    </label>
  );
}

export function RestaurarFormatoImpressaoPedido({
  pedidoId,
  formatoUrl,
}: {
  pedidoId: number;
  formatoUrl?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (formatoUrl) return;
    try {
      const salvo = localStorage.getItem(CHAVE_FORMATO_IMPRESSAO);
      if (ehFormatoImpressaoPedido(salvo) && salvo !== "a4") {
        router.replace(`/pedidos/${pedidoId}/imprimir?formato=${salvo}`);
      }
    } catch {
      /* ignore */
    }
  }, [formatoUrl, pedidoId, router]);

  return null;
}
