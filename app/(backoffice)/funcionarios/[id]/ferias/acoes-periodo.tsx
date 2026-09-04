"use client";

import { useState } from "react";
import { dataLocalISO, isoDaData } from "@/lib/financeiro";
import { MarcarGozadaButton } from "./marcar-gozada-button";
import { ProgramarFeriasForm } from "./programar-form";

type PeriodoAcoes = {
  id: number;
  status: string;
  data_fim_programada: Date | string | null;
};

export function AcoesPeriodo({
  funcionarioId,
  periodo,
}: {
  funcionarioId: number;
  periodo: PeriodoAcoes;
}) {
  const [programar, setProgramar] = useState(false);
  const fimIso = periodo.data_fim_programada
    ? isoDaData(new Date(periodo.data_fim_programada))
    : null;
  const podeGozar =
    periodo.status === "programada" &&
    fimIso != null &&
    fimIso <= dataLocalISO();

  if (periodo.status === "pendente") {
    return (
      <div className="flex flex-col gap-3">
        {programar ? (
          <>
            <ProgramarFeriasForm
              funcionarioId={funcionarioId}
              feriasId={periodo.id}
            />
            <button
              type="button"
              onClick={() => setProgramar(false)}
              className="w-fit text-sm text-texto-secundario hover:underline"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setProgramar(true)}
            className="inline-flex min-h-11 items-center text-texto-primario underline-offset-2 hover:underline md:min-h-0"
          >
            Programar férias
          </button>
        )}
      </div>
    );
  }

  if (podeGozar) {
    return (
      <MarcarGozadaButton
        funcionarioId={funcionarioId}
        feriasId={periodo.id}
      />
    );
  }

  return <span className="text-sm text-texto-secundario">—</span>;
}
