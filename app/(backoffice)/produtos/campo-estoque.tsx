"use client";

import { useState } from "react";

function textoInicial(valor?: string | null) {
  if (valor == null || valor.trim() === "") return "";
  const numero = Number(valor.replace(",", "."));
  if (!Number.isFinite(numero) || numero === 0) return "";
  return valor;
}

export function CampoEstoque({
  name,
  label,
  valorInicial,
}: {
  name: string;
  label: string;
  valorInicial?: string | null;
}) {
  const [valor, setValor] = useState(() => textoInicial(valorInicial));

  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        name={name}
        inputMode="decimal"
        placeholder="0"
        value={valor}
        onChange={(evento) => setValor(evento.target.value)}
        onFocus={(evento) => evento.target.select()}
        onBlur={() => {
          if (valor.trim() === "") setValor("");
        }}
        className="rounded border border-zinc-300 px-3 py-2"
      />
    </label>
  );
}
