"use client";

import { useState, useTransition } from "react";
import { aprovarPedidoPublico } from "./actions";

export function AprovarPedidoPublico({ token }: { token: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function aprovar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await aprovarPedidoPublico(token);
      if (resultado.error) setErro(resultado.error);
    });
  }

  return (
    <div className="print-ocultar flex flex-col gap-3">
      <button
        type="button"
        disabled={pendente}
        onClick={aprovar}
        className="min-h-12 w-full rounded bg-gradiente-brasa px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
      >
        {pendente ? "Aprovando..." : "Aprovar pedido"}
      </button>
      {erro ? (
        <p className="text-center text-sm text-vermelho-erro">{erro}</p>
      ) : null}
    </div>
  );
}
