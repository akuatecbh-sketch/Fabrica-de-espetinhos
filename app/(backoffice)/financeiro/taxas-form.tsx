"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { salvarTaxaCartao, type TaxaFormState } from "./taxas-actions";

const estadoInicial: TaxaFormState = {};

export function TaxasForm({
  formas,
}: {
  formas: { id: number; nome: string; tipo: string }[];
}) {
  const [estado, formAction, pendente] = useActionState(
    salvarTaxaCartao,
    estadoInicial,
  );
  const [formaId, setFormaId] = useState("");
  const forma = formas.find((item) => String(item.id) === formaId);
  const credito = forma?.tipo === "credito";

  return (
    <form
      action={formAction}
      className="flex w-full max-w-xl flex-col gap-4 rounded border border-zinc-200 bg-white p-4"
    >
      <h2 className="text-sm font-medium text-texto-primario">Nova taxa</h2>
      {estado.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Forma de pagamento
        <select
          name="forma_pagamento_id"
          required
          value={formaId}
          onChange={(evento) => setFormaId(evento.target.value)}
          className="rounded border border-zinc-300 px-3 py-2"
        >
          <option value="">Selecione</option>
          {formas.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </select>
      </label>

      {credito ? (
        <label className="flex flex-col gap-1 text-sm">
          Número de parcelas
          <select
            name="numero_parcelas"
            defaultValue="1"
            className="rounded border border-zinc-300 px-3 py-2"
          >
            {Array.from({ length: 12 }, (_, indice) => indice + 1).map((n) => (
              <option key={n} value={n}>
                {n}x
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="numero_parcelas" value="1" />
      )}

      <label className="flex flex-col gap-1 text-sm">
        Percentual
        <input
          name="percentual"
          type="number"
          min="0"
          max="100"
          step="0.01"
          required
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pendente}
          className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pendente ? "Salvando..." : "Salvar taxa"}
        </button>
        <Link
          href="/financeiro?aba=taxas"
          className="text-sm text-zinc-600 hover:underline"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
