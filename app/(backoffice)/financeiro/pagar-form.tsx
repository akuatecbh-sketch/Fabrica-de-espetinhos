"use client";

import { useActionState } from "react";
import { dataLocalISO } from "@/lib/financeiro";
import {
  criarContaPagar,
  type ContaFormState,
} from "./actions";
import { CategoriaFinanceiraCampo } from "./categoria-campo";
import type { CategoriaFinanceiraOpcao } from "./categoria-actions";

const estadoInicial: ContaFormState = {};

export function PagarForm({
  categorias,
  fornecedores,
}: {
  categorias: CategoriaFinanceiraOpcao[];
  fornecedores: { id: number; razao_social: string; nome_fantasia: string | null }[];
}) {
  const [estado, formAction, pendente] = useActionState(
    criarContaPagar,
    estadoInicial,
  );

  return (
    <form action={formAction} className="flex w-full max-w-xl flex-col gap-4">
      {estado.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Fornecedor
        <select
          name="fornecedor_id"
          className="rounded border border-zinc-300 px-3 py-2"
          defaultValue=""
        >
          <option value="">Sem fornecedor</option>
          {fornecedores.map((fornecedor) => (
            <option key={fornecedor.id} value={fornecedor.id}>
              {fornecedor.nome_fantasia || fornecedor.razao_social}
            </option>
          ))}
        </select>
      </label>

      <CategoriaFinanceiraCampo categoriasIniciais={categorias} />

      <label className="flex flex-col gap-1 text-sm">
        Descrição
        <input
          name="descricao"
          required
          maxLength={200}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Valor
        <input
          name="valor"
          type="number"
          min="0.01"
          step="0.01"
          required
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Data de vencimento
        <input
          name="data_vencimento"
          type="date"
          required
          defaultValue={dataLocalISO()}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input name="recorrente" type="checkbox" className="rounded border-zinc-300" />
        Recorrente — criar as próximas 11 parcelas mensais
      </label>

      <button
        type="submit"
        disabled={pendente}
        className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Salvando..." : "Cadastrar conta"}
      </button>
    </form>
  );
}
