"use client";

import { useTransition } from "react";
import { removerInsumoFicha } from "./ficha-tecnica-actions";

export function RemoverInsumoButton({
  fichaId,
  produtoFinalId,
  nome,
}: {
  fichaId: number;
  produtoFinalId: number;
  nome: string;
}) {
  const [pendente, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => {
        if (!confirm(`Remover "${nome}" da ficha técnica?`)) return;
        startTransition(async () => {
          await removerInsumoFicha(fichaId, produtoFinalId);
        });
      }}
      className="text-sm text-red-700 hover:underline disabled:opacity-60"
    >
      {pendente ? "Removendo..." : "Remover"}
    </button>
  );
}
