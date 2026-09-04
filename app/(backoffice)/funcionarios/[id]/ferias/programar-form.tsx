"use client";

import { useActionState, useMemo, useState } from "react";
import { isoDaData } from "@/lib/financeiro";
import { DIAS_FERIAS_ANO, calcularFimProgramado } from "@/lib/rh";
import { formatarData } from "@/lib/format";
import {
  programarFerias,
  type FeriasFormState,
} from "../../actions";

const estadoInicial: FeriasFormState = {};

export function ProgramarFeriasForm({
  funcionarioId,
  feriasId,
}: {
  funcionarioId: number;
  feriasId: number;
}) {
  const action = programarFerias.bind(null, funcionarioId, feriasId);
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const [inicio, setInicio] = useState("");
  const [gozados, setGozados] = useState(String(DIAS_FERIAS_ANO));
  const [vendidos, setVendidos] = useState("0");

  const fim = useMemo(() => {
    if (!inicio) return null;
    const dias = Number(gozados);
    if (!Number.isInteger(dias) || dias < 1) return null;
    return calcularFimProgramado(new Date(`${inicio}T00:00:00.000Z`), dias);
  }, [inicio, gozados]);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-3">
      {estado.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Início
          <input
            name="data_inicio_programada"
            type="date"
            required
            value={inicio}
            onChange={(evento) => setInicio(evento.target.value)}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Dias gozados
          <input
            name="dias_gozados"
            type="number"
            required
            min="1"
            max={DIAS_FERIAS_ANO}
            value={gozados}
            onChange={(evento) => setGozados(evento.target.value)}
            className="font-data rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Dias vendidos
          <input
            name="dias_vendidos"
            type="number"
            min="0"
            max={DIAS_FERIAS_ANO}
            value={vendidos}
            onChange={(evento) => setVendidos(evento.target.value)}
            className="font-data rounded border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>
      <p className="text-sm text-texto-secundario">
        Fim programado: {fim ? formatarData(fim) : "—"}
        {fim ? (
          <input type="hidden" name="data_fim_programada" value={isoDaData(fim)} />
        ) : null}
      </p>
      <button
        type="submit"
        disabled={pendente}
        className="w-fit rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Salvando..." : "Salvar programação"}
      </button>
    </form>
  );
}
