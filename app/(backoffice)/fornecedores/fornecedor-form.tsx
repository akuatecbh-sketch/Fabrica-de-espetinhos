"use client";

import { useActionState } from "react";
import {
  mascaraCnpjCpf,
  mascaraTelefone,
  formatarCnpjCpf,
  formatarTelefone,
} from "@/lib/documento";
import { CampoMascarado } from "../campo-mascarado";
import type { FornecedorFormState } from "./actions";

const estadoInicial: FornecedorFormState = {};

type FornecedorInicial = {
  razao_social: string;
  nome_fantasia: string | null;
  cnpj_cpf: string;
  inscricao_estadual: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  contato_nome: string | null;
  ativo: boolean;
};

export function FornecedorForm({
  action,
  fornecedor,
  submitLabel,
}: {
  action: (
    estado: FornecedorFormState,
    formData: FormData,
  ) => Promise<FornecedorFormState>;
  fornecedor?: FornecedorInicial;
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
        Razão social
        <input
          name="razao_social"
          required
          maxLength={150}
          defaultValue={fornecedor?.razao_social ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Nome fantasia
        <input
          name="nome_fantasia"
          maxLength={150}
          defaultValue={fornecedor?.nome_fantasia ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <CampoMascarado
        name="cnpj_cpf"
        label="CPF ou CNPJ"
        valorInicial={
          fornecedor?.cnpj_cpf
            ? formatarCnpjCpf(fornecedor.cnpj_cpf).replace("—", "")
            : ""
        }
        mascarar={mascaraCnpjCpf}
        required
        placeholder="000.000.000-00 ou 00.000.000/0000-00"
      />

      <label className="flex flex-col gap-1 text-sm">
        Inscrição estadual
        <input
          name="inscricao_estadual"
          maxLength={20}
          defaultValue={fornecedor?.inscricao_estadual ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <CampoMascarado
        name="telefone"
        label="Telefone"
        valorInicial={
          fornecedor?.telefone
            ? formatarTelefone(fornecedor.telefone).replace("—", "")
            : ""
        }
        mascarar={mascaraTelefone}
        placeholder="(00) 00000-0000"
      />

      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          name="email"
          type="email"
          maxLength={150}
          defaultValue={fornecedor?.email ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Endereço
        <input
          name="endereco"
          maxLength={255}
          defaultValue={fornecedor?.endereco ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Nome do contato
        <input
          name="contato_nome"
          maxLength={100}
          defaultValue={fornecedor?.contato_nome ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          name="ativo"
          type="checkbox"
          defaultChecked={fornecedor?.ativo ?? true}
          className="rounded border-zinc-300"
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
