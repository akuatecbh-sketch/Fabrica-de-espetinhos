"use client";

import { useActionState, useState } from "react";
import {
  cancelarProducaoFormAction,
  type CancelarProducaoState,
} from "../../actions";

const estadoInicial: CancelarProducaoState = {};

export function CancelarProducaoForm({
  producaoId,
  temSaldoNegativoProduto,
}: {
  producaoId: number;
  temSaldoNegativoProduto: boolean;
}) {
  const [estado, formAction, pendente] = useActionState(
    cancelarProducaoFormAction,
    estadoInicial,
  );
  const [motivo, setMotivo] = useState("");
  const [confirmouNegativo, setConfirmouNegativo] = useState(false);
  const motivoCurto = motivo.trim().length > 0 && motivo.trim().length < 5;
  const podeEnviar =
    !pendente &&
    motivo.trim().length >= 5 &&
    (!temSaldoNegativoProduto || confirmouNegativo);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="producao_id" value={producaoId} />

      {estado.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      ) : null}

      {temSaldoNegativoProduto ? (
        <label className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <input
            type="checkbox"
            name="confirmar_negativo_produto"
            className="mt-1"
            checked={confirmouNegativo}
            onChange={(evento) => setConfirmouNegativo(evento.target.checked)}
          />
          <span>
            O produto final já pode ter sido vendido e o saldo ficará negativo.
            Confirmo o cancelamento mesmo assim.
          </span>
        </label>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Motivo do cancelamento
        <textarea
          name="motivo"
          required
          minLength={5}
          rows={4}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          className="rounded border border-zinc-300 px-3 py-2"
        />
        {motivoCurto ? (
          <span className="text-xs text-red-700">Mínimo de 5 caracteres.</span>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={!podeEnviar}
        className="min-h-11 rounded bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Cancelando…" : "Confirmar cancelamento"}
      </button>
    </form>
  );
}
