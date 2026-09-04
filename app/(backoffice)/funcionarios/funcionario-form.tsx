"use client";

import { useActionState } from "react";
import {
  mascaraCpf,
  mascaraTelefone,
  formatarCpf,
  formatarTelefone,
} from "@/lib/documento";
import { isoDaData } from "@/lib/financeiro";
import { rotuloPerfil } from "@/lib/acesso";
import { nomeExibicao } from "@/lib/visibilidade";
import { CampoMascarado } from "../campo-mascarado";
import type { FuncionarioFormState, UsuarioOpcao } from "./actions";

const estadoInicial: FuncionarioFormState = {};

export type FuncionarioInicial = {
  nome: string;
  cpf: string;
  rg: string | null;
  data_nascimento: Date;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cargo: string;
  salario: { toString(): string };
  data_admissao: Date;
  usuario_id: number | null;
};

export function FuncionarioForm({
  action,
  funcionario,
  usuarios,
  perfilDeQuemVeVe,
  submitLabel,
}: {
  action: (
    estado: FuncionarioFormState,
    formData: FormData,
  ) => Promise<FuncionarioFormState>;
  funcionario?: FuncionarioInicial;
  usuarios: UsuarioOpcao[];
  perfilDeQuemVeVe: string;
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
          defaultValue={funcionario?.nome ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <CampoMascarado
        name="cpf"
        label="CPF"
        required
        valorInicial={
          funcionario?.cpf ? formatarCpf(funcionario.cpf).replace("—", "") : ""
        }
        mascarar={mascaraCpf}
        placeholder="000.000.000-00"
      />

      <label className="flex flex-col gap-1 text-sm">
        RG
        <input
          name="rg"
          maxLength={20}
          defaultValue={funcionario?.rg ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Data de nascimento
        <input
          name="data_nascimento"
          type="date"
          required
          defaultValue={
            funcionario ? isoDaData(funcionario.data_nascimento) : ""
          }
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <CampoMascarado
        name="telefone"
        label="Telefone"
        valorInicial={
          funcionario?.telefone
            ? formatarTelefone(funcionario.telefone).replace("—", "")
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
          defaultValue={funcionario?.email ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Endereço
        <input
          name="endereco"
          maxLength={255}
          defaultValue={funcionario?.endereco ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Cargo
        <input
          name="cargo"
          required
          maxLength={80}
          defaultValue={funcionario?.cargo ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Salário
        <input
          name="salario"
          type="number"
          required
          min="0"
          step="0.01"
          defaultValue={
            funcionario ? Number(funcionario.salario.toString()) : ""
          }
          className="font-data rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Data de admissão
        <input
          name="data_admissao"
          type="date"
          required
          defaultValue={
            funcionario ? isoDaData(funcionario.data_admissao) : ""
          }
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Vincular a um usuário do sistema
        <select
          name="usuario_id"
          defaultValue={funcionario?.usuario_id ?? ""}
          className="rounded border border-zinc-300 bg-white px-3 py-2"
        >
          <option value="">Nenhum</option>
          {usuarios.map((usuario) => {
            const visivel = nomeExibicao(usuario, perfilDeQuemVeVe);
            return (
              <option key={usuario.id} value={usuario.id}>
                {visivel.nome} · {visivel.email} · {rotuloPerfil(usuario.perfil)}
              </option>
            );
          })}
        </select>
        <span className="text-xs text-texto-secundario">
          Opcional. Útil se o funcionário também opera o PDV.
        </span>
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
