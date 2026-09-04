"use client";

import { useState, useTransition } from "react";
import { dataLocalISO } from "@/lib/financeiro";
import { desligarFuncionario } from "./actions";

export function DesligarButton({
  id,
  nome,
}: {
  id: number;
  nome: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(dataLocalISO());
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => {
          setErro(null);
          setAberto(true);
        }}
        className="inline-flex min-h-11 items-center text-red-700 hover:underline md:min-h-0"
      >
        Desligar
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-2">
      <label className="flex flex-col gap-1 text-xs text-texto-secundario">
        Data de demissão
        <input
          type="date"
          value={data}
          onChange={(evento) => setData(evento.target.value)}
          className="rounded border border-zinc-300 px-2 py-1 text-sm text-texto-primario"
        />
      </label>
      <span className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pendente}
          onClick={() => {
            setErro(null);
            startTransition(async () => {
              const resultado = await desligarFuncionario(id, data);
              if (resultado.error) {
                setErro(resultado.error);
                return;
              }
              setAberto(false);
            });
          }}
          className="text-sm text-red-700 hover:underline disabled:opacity-60"
        >
          {pendente ? "Desligando..." : `Confirmar desligamento de ${nome}`}
        </button>
        <button
          type="button"
          disabled={pendente}
          onClick={() => setAberto(false)}
          className="text-sm text-texto-secundario hover:underline"
        >
          Cancelar
        </button>
      </span>
      {erro ? <span className="max-w-64 text-xs text-red-700">{erro}</span> : null}
    </span>
  );
}
