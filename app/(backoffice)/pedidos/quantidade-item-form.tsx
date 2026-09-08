"use client";

import { useActionState } from "react";
import { atualizarQuantidadeItem, type PedidoFormState } from "./actions";

const estadoInicial: PedidoFormState = {};

export function QuantidadeItemPedidoForm({
  itemId,
  vendidoEmPacote,
  quantidade,
  quantidadePacotes,
}: {
  itemId: number;
  vendidoEmPacote: boolean;
  quantidade: string;
  quantidadePacotes: number | null;
}) {
  const [estado, formAction, pendente] = useActionState(
    atualizarQuantidadeItem.bind(null, itemId),
    estadoInicial,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      {vendidoEmPacote ? (
        <label className="flex items-center gap-2 text-sm">
          Pacotes
          <input
            name="quantidade_pacotes"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={quantidadePacotes ?? 1}
            className="font-data w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </label>
      ) : (
        <label className="flex items-center gap-2 text-sm">
          Qtd
          <input
            name="quantidade"
            type="number"
            min="0.001"
            step="0.001"
            required
            defaultValue={quantidade}
            className="font-data w-24 rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </label>
      )}
      <button
        type="submit"
        disabled={pendente}
        className="text-sm text-texto-primario hover:underline disabled:opacity-60"
      >
        {pendente ? "Salvando..." : "Salvar"}
      </button>
      {estado.error ? (
        <span className="text-xs text-red-700">{estado.error}</span>
      ) : null}
    </form>
  );
}
