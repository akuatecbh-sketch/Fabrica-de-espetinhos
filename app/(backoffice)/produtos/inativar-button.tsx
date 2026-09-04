"use client";

import { useTransition } from "react";
import { inativarProduto } from "./actions";

export function InativarButton({ id, nome }: { id: number; nome: string }) {
  const [pendente, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => {
        if (!confirm(`Inativar o produto "${nome}"?`)) return;
        startTransition(async () => {
          await inativarProduto(id);
        });
      }}
      className="inline-flex min-h-11 items-center text-red-700 hover:underline disabled:opacity-60 md:min-h-0"
    >
      {pendente ? "Inativando..." : "Inativar"}
    </button>
  );
}
