"use client";

import { useTransition } from "react";
import { cancelarVenda } from "./actions";

export function CancelarVendaButton({ id }: { id: number }) {
  const [pendente, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => {
        if (!confirm("Cancelar esta venda? Os itens não serão cobrados.")) {
          return;
        }
        startTransition(async () => {
          await cancelarVenda(id);
        });
      }}
      className="min-h-11 rounded border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60 lg:min-h-0"
    >
      {pendente ? "Cancelando..." : "Cancelar venda"}
    </button>
  );
}
