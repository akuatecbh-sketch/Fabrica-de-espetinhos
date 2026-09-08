"use client";

import { useState, useTransition } from "react";
import { cancelarPedido, marcarPedidoEnviado } from "./actions";

export function AcoesPedido({
  pedidoId,
  status,
}: {
  pedidoId: number;
  status: string;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [acao, setAcao] = useState<"enviar" | "cancelar" | null>(null);
  const [pendente, startTransition] = useTransition();

  function enviar() {
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

  const podeEnviar = status === "aberto";
  const podeCancelar = status === "aberto" || status === "enviado";
  if (!podeEnviar && !podeCancelar) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {podeEnviar ? (
          <button
            type="button"
            disabled={pendente}
            onClick={enviar}
            className="min-h-11 rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60 lg:min-h-0"
          >
            {acao === "enviar" && pendente
              ? "Enviando..."
              : "Marcar como enviado"}
          </button>
        ) : null}
        {podeCancelar ? (
          <button
            type="button"
            disabled={pendente}
            onClick={cancelar}
            className="min-h-11 rounded border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60 lg:min-h-0"
          >
            {acao === "cancelar" && pendente
              ? "Cancelando..."
              : "Cancelar pedido"}
          </button>
        ) : null}
      </div>
      {erro ? (
        <p className="text-sm text-vermelho-erro">{erro}</p>
      ) : null}
    </div>
  );
}
