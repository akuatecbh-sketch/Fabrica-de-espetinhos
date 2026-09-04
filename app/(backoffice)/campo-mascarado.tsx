"use client";

import { useState } from "react";

export function CampoMascarado({
  name,
  label,
  valorInicial,
  mascarar,
  required,
  placeholder,
}: {
  name: string;
  label: string;
  valorInicial?: string;
  mascarar: (valor: string) => string;
  required?: boolean;
  placeholder?: string;
}) {
  const [valor, setValor] = useState(valorInicial ?? "");

  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        name={name}
        value={valor}
        placeholder={placeholder}
        required={required}
        onChange={(evento) => setValor(mascarar(evento.target.value))}
        className="rounded border border-zinc-300 px-3 py-2"
      />
    </label>
  );
}
