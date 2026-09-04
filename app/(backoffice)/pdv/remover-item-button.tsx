"use client";

import { useTransition } from "react";
import { removerItem } from "./actions";

export function RemoverItemButton({ id, nome }: { id: number; nome: string }) {
  const [pendente, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => {
        if (!confirm(`Remover "${nome}" da venda?`)) return;
        startTransition(async () => {
          await removerItem(id);
        });
      }}
      className="inline-flex min-h-11 items-center text-red-700 hover:underline disabled:opacity-60 lg:min-h-0"
    >
      {pendente ? "Removendo..." : "Remover"}
    </button>
  );
}
