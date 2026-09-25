"use client";

import { useTransition } from "react";
import { ativarProduto, inativarProduto } from "./actions";

export function AlternarAtivoButton({
  id,
  nome,
  ativo,
}: {
  id: number;
  nome: string;
  ativo: boolean;
}) {
  const [pendente, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => {
        if (ativo) {
          if (!confirm(`Inativar o produto "${nome}"?`)) return;
          startTransition(async () => {
            await inativarProduto(id);
          });
          return;
        }
        if (!confirm(`Reativar ${nome}?`)) return;
        startTransition(async () => {
          await ativarProduto(id);
        });
      }}
      className={
        ativo
          ? "inline-flex min-h-11 items-center text-red-700 hover:underline disabled:opacity-60 md:min-h-0"
          : "inline-flex min-h-11 items-center text-verde-texto hover:underline disabled:opacity-60 md:min-h-0"
      }
    >
      {pendente
        ? ativo
          ? "Inativando..."
          : "Ativando..."
        : ativo
          ? "Inativar"
          : "Ativar"}
    </button>
  );
}
