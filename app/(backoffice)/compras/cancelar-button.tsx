"use client";

import { useTransition, useState } from "react";
import { cancelarNotaConferida } from "./actions";

export function CancelarNotaButton({ id }: { id: number }) {
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          if (
            !confirm(
              "Cancelar esta nota? O estoque será revertido e a conta a pagar será cancelada.",
            )
          ) {
            return;
          }
          setErro(null);
          startTransition(async () => {
            const resultado = await cancelarNotaConferida(id);
            if (resultado?.error) setErro(resultado.error);
          });
        }}
        className="inline-flex min-h-11 items-center text-red-700 hover:underline disabled:opacity-60 md:min-h-0"
      >
        {pendente ? "Cancelando..." : "Cancelar nota"}
      </button>
      {erro ? <span className="max-w-72 text-xs text-red-700">{erro}</span> : null}
    </span>
  );
}
