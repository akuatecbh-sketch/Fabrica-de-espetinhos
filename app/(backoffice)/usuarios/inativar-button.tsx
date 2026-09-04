"use client";

import { useState, useTransition } from "react";
import { inativarUsuario } from "./actions";

export function InativarUsuarioButton({
  id,
  nome,
}: {
  id: number;
  nome: string;
}) {
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          if (!confirm(`Inativar o usuário "${nome}"?`)) return;
          setErro(null);
          startTransition(async () => {
            const resultado = await inativarUsuario(id);
            if (resultado.error) setErro(resultado.error);
          });
        }}
        className="inline-flex min-h-11 items-center text-red-700 hover:underline disabled:opacity-60 md:min-h-0"
      >
        {pendente ? "Inativando..." : "Inativar"}
      </button>
      {erro ? <span className="max-w-56 text-xs text-red-700">{erro}</span> : null}
    </span>
  );
}
