"use client";

import { useActionState } from "react";
import type { FichaFormState } from "./ficha-tecnica-actions";

const estadoInicial: FichaFormState = {};

export function QuantidadeInsumoForm({
  action,
  quantidade,
}: {
  action: (estado: FichaFormState, formData: FormData) => Promise<FichaFormState>;
  quantidade: string;
}) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        name="quantidade"
        inputMode="decimal"
        required
        defaultValue={quantidade}
        className="w-28 rounded border border-zinc-300 px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={pendente}
        className="text-sm text-zinc-800 hover:underline disabled:opacity-60"
      >
        {pendente ? "Salvando..." : "Salvar"}
      </button>
      {estado.error ? (
        <span className="text-xs text-red-700">{estado.error}</span>
      ) : null}
    </form>
  );
}
