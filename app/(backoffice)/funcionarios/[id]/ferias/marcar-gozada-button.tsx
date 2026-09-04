"use client";

import { useState, useTransition } from "react";
import { marcarFeriasGozada } from "../../actions";

export function MarcarGozadaButton({
  funcionarioId,
  feriasId,
}: {
  funcionarioId: number;
  feriasId: number;
}) {
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          if (!confirm("Marcar este período como gozado? O próximo ciclo será criado automaticamente.")) {
            return;
          }
          setErro(null);
          startTransition(async () => {
            const resultado = await marcarFeriasGozada(funcionarioId, feriasId);
            if (resultado.error) setErro(resultado.error);
          });
        }}
        className="inline-flex min-h-11 items-center text-texto-primario underline-offset-2 hover:underline disabled:opacity-60 md:min-h-0"
      >
        {pendente ? "Salvando..." : "Marcar como gozada"}
      </button>
      {erro ? <span className="max-w-72 text-xs text-red-700">{erro}</span> : null}
    </span>
  );
}
