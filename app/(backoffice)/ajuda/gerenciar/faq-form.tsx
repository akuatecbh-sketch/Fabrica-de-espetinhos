"use client";

import { useActionState } from "react";
import type { FaqFormState } from "./actions";

const estadoInicial: FaqFormState = {};

type FaqInicial = {
  titulo: string;
  palavras_chave: string | null;
  resposta: string;
  rota_destino: string;
  modulo_chave: string | null;
  ordem: number;
  ativo: boolean;
};

type ModuloOpcao = {
  chave: string;
  nome: string;
};

export function FaqForm({
  action,
  item,
  modulos,
  submitLabel,
}: {
  action: (
    estado: FaqFormState,
    formData: FormData,
  ) => Promise<FaqFormState>;
  item?: FaqInicial;
  modulos: ModuloOpcao[];
  submitLabel: string;
}) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  return (
    <form action={formAction} className="flex w-full max-w-xl flex-col gap-4">
      {estado.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Título
        <input
          name="titulo"
          required
          maxLength={200}
          defaultValue={item?.titulo ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Palavras-chave
        <input
          name="palavras_chave"
          maxLength={500}
          defaultValue={item?.palavras_chave ?? ""}
          placeholder="nota fiscal, compra, entrada"
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Resposta
        <textarea
          name="resposta"
          required
          rows={4}
          defaultValue={item?.resposta ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Rota de destino
        <input
          name="rota_destino"
          required
          maxLength={200}
          defaultValue={item?.rota_destino ?? ""}
          placeholder="/compras/nova"
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Módulo vinculado
        <select
          name="modulo_chave"
          defaultValue={item?.modulo_chave ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        >
          <option value="">Nenhum — visível para todos</option>
          {modulos.map((modulo) => (
            <option key={modulo.chave} value={modulo.chave}>
              {modulo.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Ordem
        <input
          name="ordem"
          type="number"
          step="1"
          defaultValue={item?.ordem ?? 0}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          name="ativo"
          type="checkbox"
          defaultChecked={item?.ativo ?? true}
          className="h-4 w-4"
        />
        Ativo
      </label>

      <button
        type="submit"
        disabled={pendente}
        className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
