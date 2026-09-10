"use client";

import { useRef, useState, useTransition } from "react";
import {
  classesStatusPedido,
  ehSituacaoManual,
  rotuloStatusPedido,
  STATUS_SITUACAO_MANUAL,
} from "@/lib/pedido";
import { alterarSituacaoPedido } from "./actions";

export function BadgeSituacaoPedido({
  pedidoId,
  status,
}: {
  pedidoId: number;
  status: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const raizRef = useRef<HTMLDivElement>(null);

  if (!ehSituacaoManual(status)) {
    return (
      <span className={classesStatusPedido(status)}>
        {rotuloStatusPedido(status)}
      </span>
    );
  }

  function escolher(proximo: string) {
    setErro(null);
    setAberto(false);
    if (proximo === status) return;
    startTransition(async () => {
      const resultado = await alterarSituacaoPedido(pedidoId, proximo);
      if (resultado.error) setErro(resultado.error);
    });
  }

  return (
    <div className="relative inline-flex flex-col items-start gap-1" ref={raizRef}>
      <button
        type="button"
        disabled={pendente}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        onClick={() => setAberto((atual) => !atual)}
        onBlur={(evento) => {
          if (!raizRef.current?.contains(evento.relatedTarget as Node | null)) {
            setAberto(false);
          }
        }}
        className={`${classesStatusPedido(status)} inline-flex min-h-11 cursor-pointer items-center gap-1 disabled:opacity-60 lg:min-h-0`}
      >
        {rotuloStatusPedido(status)}
        <span aria-hidden className="text-[10px]">
          ▾
        </span>
      </button>
      {aberto ? (
        <ul
          role="listbox"
          className="absolute top-full left-0 z-20 mt-1 min-w-40 rounded border border-borda bg-superficie py-1 shadow-md"
        >
          {STATUS_SITUACAO_MANUAL.map((opcao) => {
            const atual = opcao === status;
            return (
              <li key={opcao}>
                <button
                  type="button"
                  role="option"
                  aria-selected={atual}
                  disabled={pendente}
                  onMouseDown={(evento) => evento.preventDefault()}
                  onClick={() => escolher(opcao)}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-fundo-hover disabled:opacity-60 lg:min-h-0 ${
                    atual ? "font-semibold text-texto-primario" : "text-texto-secundario"
                  }`}
                >
                  <span className={classesStatusPedido(opcao)}>
                    {rotuloStatusPedido(opcao)}
                  </span>
                  {atual ? <span className="text-xs">Atual</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {erro ? <p className="text-xs text-vermelho-erro">{erro}</p> : null}
    </div>
  );
}
