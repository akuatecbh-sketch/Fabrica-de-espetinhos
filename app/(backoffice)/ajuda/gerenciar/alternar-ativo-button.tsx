"use client";

import { useTransition, useState } from "react";
import { desativarFaq, reativarFaq } from "./actions";

export function AlternarAtivoButton({
  id,
  titulo,
  ativo,
}: {
  id: number;
  titulo: string;
  ativo: boolean;
}) {
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          const acao = ativo ? "Desativar" : "Reativar";
          if (!confirm(`${acao} a pergunta "${titulo}"?`)) return;
          setErro(null);
          startTransition(async () => {
            const resultado = ativo
              ? await desativarFaq(id)
              : await reativarFaq(id);
            if (resultado.error) setErro(resultado.error);
          });
        }}
        className={`inline-flex min-h-11 items-center hover:underline disabled:opacity-60 md:min-h-0 ${
          ativo ? "text-red-700" : "text-texto-primario"
        }`}
      >
        {pendente
          ? ativo
            ? "Desativando..."
            : "Reativando..."
          : ativo
            ? "Desativar"
            : "Reativar"}
      </button>
      {erro ? <span className="max-w-56 text-xs text-red-700">{erro}</span> : null}
    </span>
  );
}
