"use client";

import { useTransition } from "react";
import { inativarFornecedor } from "./actions";

export function InativarFornecedorButton({
  id,
  nome,
}: {
  id: number;
  nome: string;
}) {
  const [pendente, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => {
        if (!confirm(`Inativar o fornecedor "${nome}"?`)) return;
        startTransition(async () => {
          await inativarFornecedor(id);
        });
      }}
      className="inline-flex min-h-11 items-center text-red-700 hover:underline disabled:opacity-60 md:min-h-0"
    >
      {pendente ? "Inativando..." : "Inativar"}
    </button>
  );
}
