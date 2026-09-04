"use client";

import { useActionState, useMemo, useState } from "react";
import { formatarPreco } from "@/lib/format";
import { arredondarDinheiro } from "@/lib/dinheiro";
import { fecharCaixa, type CaixaFormState } from "./actions";

const estadoInicial: CaixaFormState = {};

export function FecharCaixaForm({
  caixaId,
  valorSistema,
  vendasPendentes,
}: {
  caixaId: number;
  valorSistema: number;
  vendasPendentes: number;
}) {
  const fechar = fecharCaixa.bind(null, caixaId);
  const [estado, formAction, pendente] = useActionState(fechar, estadoInicial);
  const [contado, setContado] = useState("");
  const informado = Number(contado.replace(",", "."));
  const diferenca = useMemo(() => {
    if (!Number.isFinite(informado) || contado.trim() === "") return null;
    return arredondarDinheiro(informado - valorSistema);
  }, [contado, informado, valorSistema]);

  return (
    <form action={formAction} className="flex w-full max-w-xl flex-col gap-4">
      {estado.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      ) : null}

      {vendasPendentes > 0 ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Há {vendasPendentes} venda(s) em andamento no PDV. Finalize ou cancele
          as abas antes de fechar o caixa.
        </p>
      ) : null}

      <p className="text-sm text-texto-primario">
        Valor do sistema (abertura + dinheiro):{" "}
        <strong className="font-data">{formatarPreco(valorSistema)}</strong>
      </p>

      <label className="flex flex-col gap-1 text-sm">
        Valor contado no caixa
        <input
          name="valor_fechamento_informado"
          type="number"
          min="0"
          step="0.01"
          required
          value={contado}
          onChange={(evento) => setContado(evento.target.value)}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      {diferenca != null ? (
        <p
          className={`text-sm ${
            diferenca === 0
              ? "text-verde-sucesso"
              : "text-vermelho-erro"
          }`}
        >
          Diferença:{" "}
          <strong className="font-data">{formatarPreco(diferenca)}</strong>
          {diferenca > 0 ? " (sobra)" : diferenca < 0 ? " (falta)" : ""}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pendente || vendasPendentes > 0}
        className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Fechando..." : "Fechar caixa"}
      </button>
    </form>
  );
}
