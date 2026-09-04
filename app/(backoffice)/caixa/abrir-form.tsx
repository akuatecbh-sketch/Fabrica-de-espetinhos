"use client";

import { useActionState } from "react";
import { abrirCaixa, type CaixaFormState } from "./actions";

const estadoInicial: CaixaFormState = {};

export function AbrirCaixaForm() {
  const [estado, formAction, pendente] = useActionState(
    abrirCaixa,
    estadoInicial,
  );

  return (
    <form action={formAction} className="flex w-full max-w-xl flex-col gap-4">
      {estado.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Valor de abertura (fundo de troco)
        <input
          name="valor_abertura"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue="0"
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={pendente}
        className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Abrindo..." : "Abrir caixa"}
      </button>
    </form>
  );
}
