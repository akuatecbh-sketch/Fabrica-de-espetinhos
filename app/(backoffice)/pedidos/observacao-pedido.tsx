"use client";

import { useActionState } from "react";
import { salvarObservacaoPedido, type PedidoFormState } from "./actions";

const estadoInicial: PedidoFormState = {};

export function ObservacaoPedido({
  pedidoId,
  observacao,
  somenteLeitura,
}: {
  pedidoId: number | null;
  observacao: string;
  somenteLeitura: boolean;
}) {
  const [estado, formAction, pendente] = useActionState(
    salvarObservacaoPedido,
    estadoInicial,
  );

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">Observação</h2>
      {somenteLeitura ? (
        <p className="whitespace-pre-wrap rounded border border-borda bg-fundo px-3 py-2 text-sm text-texto-primario">
          {observacao || "Nenhuma observação."}
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="pedido_id" value={pedidoId ?? ""} />
          <textarea
            name="observacao"
            defaultValue={observacao}
            rows={3}
            maxLength={2000}
            className="rounded border border-borda bg-superficie px-3 py-2 text-sm"
            placeholder="Observação geral do pedido"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={pendente}
              className="min-h-11 w-fit rounded border border-borda bg-superficie px-3 py-2 text-sm font-medium text-texto-primario hover:bg-fundo-hover disabled:opacity-60 lg:min-h-0"
            >
              {pendente ? "Salvando..." : "Salvar observação"}
            </button>
            {estado.error ? (
              <span className="text-xs text-red-700">{estado.error}</span>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}
