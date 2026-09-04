"use client";

import { useActionState } from "react";
import {
  mascaraCpf,
  mascaraTelefone,
  formatarCpf,
  formatarTelefone,
} from "@/lib/documento";
import { isoDaData } from "@/lib/financeiro";
import { CampoMascarado } from "../campo-mascarado";
import type { ClienteFormState } from "./actions";

const estadoInicial: ClienteFormState = {};

type ClienteInicial = {
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  data_nascimento: Date | null;
};

export function ClienteForm({
  action,
  cliente,
  submitLabel,
}: {
  action: (
    estado: ClienteFormState,
    formData: FormData,
  ) => Promise<ClienteFormState>;
  cliente?: ClienteInicial;
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
        Nome
        <input
          name="nome"
          required
          maxLength={150}
          defaultValue={cliente?.nome ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <CampoMascarado
        name="cpf"
        label="CPF"
        valorInicial={
          cliente?.cpf ? formatarCpf(cliente.cpf).replace("—", "") : ""
        }
        mascarar={mascaraCpf}
        placeholder="000.000.000-00"
      />

      <CampoMascarado
        name="telefone"
        label="Telefone"
        valorInicial={
          cliente?.telefone
            ? formatarTelefone(cliente.telefone).replace("—", "")
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
          defaultValue={cliente?.email ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Endereço
        <input
          name="endereco"
          maxLength={255}
          defaultValue={cliente?.endereco ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Data de nascimento
        <input
          name="data_nascimento"
          type="date"
          defaultValue={
            cliente?.data_nascimento ? isoDaData(cliente.data_nascimento) : ""
          }
          className="rounded border border-zinc-300 px-3 py-2"
        />
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
