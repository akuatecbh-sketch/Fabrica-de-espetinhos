"use client";

import { useState, useTransition } from "react";
import { cancelarPedido } from "./actions";

export function BotaoCancelarPedido({
  pedidoId,
  numero,
  disabled,
  title,
}: {
  pedidoId: number;
  numero: number;
  disabled?: boolean;
  title?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const motivoCurto = motivo.trim().length > 0 && motivo.trim().length < 5;
  const podeEnviar = !pendente && !disabled && motivo.trim().length >= 5;

  const classe =
    "inline-flex min-h-11 items-center text-sm text-red-700 underline-offset-2 hover:underline md:min-h-0";

  if (disabled) {
    return (
      <span
        title={title}
        className={`${classe} cursor-not-allowed text-zinc-400 no-underline opacity-60`}
      >
        Cancelar
      </span>
    );
  }

  function confirmar() {
    if (!podeEnviar) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await cancelarPedido(pedidoId, motivo);
      if (resultado.error) {
        setErro(resultado.error);
        return;
      }
      setAberto(false);
      setMotivo("");
    });
  }

  return (
    <>
      <button
        type="button"
        title={title}
        className={classe}
        onClick={() => {
          setErro(null);
          setAberto(true);
        }}
      >
        Cancelar
      </button>
      {aberto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`cancelar-pedido-${pedidoId}`}
        >
          <div className="w-full max-w-md rounded-lg border border-borda bg-superficie p-5 shadow-lg">
            <h2
              id={`cancelar-pedido-${pedidoId}`}
              className="text-lg font-semibold text-texto-primario"
            >
              Cancelar pedido #{numero}
            </h2>
            <p className="mt-2 text-sm text-texto-secundario">
              Informe o motivo. O pedido deixará de aparecer no link público.
              Pedido convertido em venda não pode ser cancelado por aqui.
            </p>
            <label className="mt-4 flex flex-col gap-1 text-sm">
              Motivo
              <textarea
                name="motivo"
                value={motivo}
                onChange={(evento) => setMotivo(evento.target.value)}
                rows={3}
                placeholder="Descreva o motivo do cancelamento"
                className="rounded border border-zinc-300 px-3 py-2"
              />
            </label>
            {motivoCurto ? (
              <p className="mt-1 text-xs text-vermelho-erro">
                Informe pelo menos 5 caracteres.
              </p>
            ) : null}
            {erro ? (
              <p className="mt-2 text-sm text-vermelho-erro">{erro}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={pendente}
                onClick={() => setAberto(false)}
                className="min-h-11 rounded border border-borda px-4 py-2 text-sm hover:bg-fundo-hover disabled:opacity-60"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={!podeEnviar}
                onClick={confirmar}
                className="min-h-11 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                {pendente ? "Cancelando..." : "Confirmar cancelamento"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
