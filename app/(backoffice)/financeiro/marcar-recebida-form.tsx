"use client";

import { useActionState, useState } from "react";
import { dataLocalISO } from "@/lib/financeiro";
import { marcarContaRecebida, type ContaFormState } from "./actions";

const estadoInicial: ContaFormState = {};

export function MarcarRecebidaForm({ id }: { id: number }) {
  const [aberto, setAberto] = useState(false);
  const action = marcarContaRecebida.bind(null, id);
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex min-h-11 items-center text-sm text-texto-primario underline-offset-2 hover:underline md:min-h-0"
      >
        Marcar como recebida
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      {estado.error ? (
        <p className="text-xs text-red-700">{estado.error}</p>
      ) : null}
      <label className="flex flex-col gap-1 text-xs text-zinc-600">
        Data do recebimento
        <input
          name="data_recebimento"
          type="date"
          required
          defaultValue={dataLocalISO()}
          className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pendente}
          className="rounded bg-gradiente-brasa px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
        >
          {pendente ? "Salvando..." : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-xs text-zinc-600 hover:underline"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
