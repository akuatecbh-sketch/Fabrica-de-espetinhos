"use client";

import { useTransition, useState } from "react";
import { excluirNotaRascunho } from "./actions";

export function ExcluirNotaButton({ id }: { id: number }) {
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          if (!confirm("Excluir este rascunho da nota?")) return;
          setErro(null);
          startTransition(async () => {
            const resultado = await excluirNotaRascunho(id);
            if (resultado?.error) setErro(resultado.error);
          });
        }}
        className="inline-flex min-h-11 items-center text-red-700 hover:underline disabled:opacity-60 md:min-h-0"
      >
        {pendente ? "Excluindo..." : "Excluir"}
      </button>
      {erro ? <span className="max-w-56 text-xs text-red-700">{erro}</span> : null}
    </span>
  );
}
