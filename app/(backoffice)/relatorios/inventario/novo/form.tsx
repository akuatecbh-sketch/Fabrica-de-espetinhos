"use client";

import { useActionState } from "react";
import { criarContagem, type InventarioFormState } from "../actions";

const estadoInicial: InventarioFormState = {};

export function NovaContagemForm() {
  const [estado, formAction, pendente] = useActionState(
    criarContagem,
    estadoInicial,
  );

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Descrição
        <input
          name="descricao"
          required
          maxLength={200}
          placeholder="Ex.: Contagem de setembro"
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>
      <p className="text-sm text-texto-secundario">
        Ao criar, entram todos os produtos ativos com controle de estoque
        (exceto serviços, como Frete). O saldo do sistema é fotografado neste
        momento.
      </p>
      {estado.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pendente}
        className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Criando..." : "Criar contagem"}
      </button>
    </form>
  );
}
