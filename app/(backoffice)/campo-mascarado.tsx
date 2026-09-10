"use client";

import { useState, type ReactNode } from "react";

export function CampoMascarado({
  name,
  label,
  valorInicial,
  mascarar,
  required,
  placeholder,
  onBlur,
  acao,
}: {
  name: string;
  label: string;
  valorInicial?: string;
  mascarar: (valor: string) => string;
  required?: boolean;
  placeholder?: string;
  onBlur?: (valor: string) => void;
  acao?: ReactNode;
}) {
  const [valor, setValor] = useState(valorInicial ?? "");

  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <span className="flex items-stretch gap-2">
        <input
          name={name}
          value={valor}
          placeholder={placeholder}
          required={required}
          onChange={(evento) => setValor(mascarar(evento.target.value))}
          onBlur={() => onBlur?.(valor)}
          className="min-w-0 flex-1 rounded border border-zinc-300 px-3 py-2"
        />
        {acao}
      </span>
    </label>
  );
}
