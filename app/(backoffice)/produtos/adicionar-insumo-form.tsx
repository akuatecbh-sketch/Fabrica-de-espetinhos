"use client";

import { useActionState } from "react";
import type { FichaFormState } from "./ficha-tecnica-actions";

const estadoInicial: FichaFormState = {};

type InsumoOpcao = {
  id: number;
  nome: string;
  unidade: string;
};

export function AdicionarInsumoForm({
  action,
  insumos,
}: {
  action: (estado: FichaFormState, formData: FormData) => Promise<FichaFormState>;
  insumos: InsumoOpcao[];
}) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  if (insumos.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        Não há insumos ou embalagens ativos disponíveis para vincular.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-3">
      {estado.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        Insumo
        <select
          name="insumo_id"
          required
          defaultValue=""
          className="rounded border border-zinc-300 px-3 py-2"
        >
          <option value="">Selecione</option>
          {insumos.map((insumo) => (
            <option key={insumo.id} value={insumo.id}>
              {insumo.nome} ({insumo.unidade})
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Quantidade por unidade do produto
        <input
          name="quantidade"
          inputMode="decimal"
          required
          placeholder="Ex.: 0,150"
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pendente}
        className="w-fit rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Adicionando..." : "Adicionar insumo"}
      </button>
    </form>
  );
}
