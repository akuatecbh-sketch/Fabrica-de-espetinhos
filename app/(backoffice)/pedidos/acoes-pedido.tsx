"use client";

import { useState, useTransition } from "react";
import {
  cancelarPedido,
  converterPedidoEmVenda,
  marcarPedidoEnviado,
} from "./actions";

export function AcoesPedido({
  pedidoId,
  status,
  temItens,
}: {
  pedidoId: number;
  status: string;
  temItens: boolean;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [acao, setAcao] = useState<"enviar" | "cancelar" | "vender" | null>(
    null,
  );
  const [pendente, startTransition] = useTransition();

  function finalizar() {
    setErro(null);
    setAcao("enviar");
    startTransition(async () => {
      const resultado = await marcarPedidoEnviado(pedidoId);
      if (resultado.error) setErro(resultado.error);
      setAcao(null);
    });
  }

  function cancelar() {
    if (!confirm("Cancelar este pedido?")) return;
    setErro(null);
    setAcao("cancelar");
    startTransition(async () => {
      const resultado = await cancelarPedido(pedidoId);
      if (resultado.error) setErro(resultado.error);
      setAcao(null);
    });
  }

  function vender() {
    setErro(null);
    setAcao("vender");
    startTransition(async () => {
      const resultado = await converterPedidoEmVenda(pedidoId);
      if (resultado?.error) setErro(resultado.error);
      setAcao(null);
    });
  }

  const emEdicao = status === "aberto" || status === "enviado" || status === "aprovado";
  const podeFinalizarOuVender = emEdicao && temItens;
  const podeCancelar = emEdicao;
  if (!podeFinalizarOuVender && !podeCancelar) return null;

  return (
    <div className="flex flex-col gap-3">
      {podeFinalizarOuVender ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pendente}
            onClick={finalizar}
            className="min-h-11 rounded border border-borda bg-superficie px-4 py-2 text-sm font-medium text-texto-primario hover:bg-fundo-hover disabled:opacity-60 lg:min-h-0"
          >
            {acao === "enviar" && pendente
              ? "Finalizando..."
              : "Finalizar pedido"}
          </button>
          <button
            type="button"
            disabled={pendente}
            onClick={vender}
            className="min-h-11 rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60 lg:min-h-0"
          >
            {acao === "vender" && pendente ? "Convertendo..." : "Vender"}
          </button>
        </div>
      ) : null}
      {podeCancelar ? (
        <button
          type="button"
          disabled={pendente}
          onClick={cancelar}
          className="min-h-11 w-fit rounded border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60 lg:min-h-0"
        >
          {acao === "cancelar" && pendente
            ? "Cancelando..."
            : "Cancelar pedido"}
        </button>
      ) : null}
      {erro ? <p className="text-sm text-vermelho-erro">{erro}</p> : null}
    </div>
  );
}
