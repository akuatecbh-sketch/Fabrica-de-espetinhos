"use client";

import { useTransition } from "react";
import {
  CATEGORIAS_PRECO,
  rotuloCategoriaPreco,
  type CategoriaPreco,
} from "@/lib/cliente";
import { normalizarCategoriaPreco } from "@/lib/preco-categoria";

export function SeletorCategoriaPreco({
  valor,
  disabled = false,
  aoAlterar,
}: {
  valor: string | null | undefined;
  disabled?: boolean;
  aoAlterar: (categoria: CategoriaPreco) => Promise<{ error?: string } | void>;
}) {
  const atual = normalizarCategoriaPreco(valor);
  const [pendente, startTransition] = useTransition();
  const bloqueado = disabled || pendente;

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="text-sm font-medium">Categoria de preço</legend>
      <div className="flex flex-wrap gap-3">
        {CATEGORIAS_PRECO.map((categoria) => (
          <label
            key={categoria}
            className={`flex items-center gap-2 text-sm ${
              bloqueado ? "opacity-60" : ""
            }`}
          >
            <input
              type="radio"
              name="tipo_preco"
              value={categoria}
              checked={atual === categoria}
              disabled={bloqueado}
              onChange={() => {
                if (categoria === atual) return;
                startTransition(async () => {
                  await aoAlterar(categoria);
                });
              }}
            />
            {rotuloCategoriaPreco(categoria)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
