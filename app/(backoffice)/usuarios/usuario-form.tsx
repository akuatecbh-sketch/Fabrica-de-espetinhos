"use client";

import { useActionState } from "react";
import { rotuloPerfil } from "@/lib/acesso";
import type { UsuarioFormState } from "./actions";

const estadoInicial: UsuarioFormState = {};

type UsuarioInicial = {
  nome: string;
  email: string;
  perfil: string;
};

export function UsuarioForm({
  action,
  usuario,
  perfis,
  submitLabel,
  criar,
}: {
  action: (
    estado: UsuarioFormState,
    formData: FormData,
  ) => Promise<UsuarioFormState>;
  usuario?: UsuarioInicial;
  perfis: readonly string[];
  submitLabel: string;
  criar?: boolean;
}) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const opcoes =
    usuario && !perfis.includes(usuario.perfil)
      ? [usuario.perfil, ...perfis]
      : [...perfis];

  return (
    <form action={formAction} className="flex w-full max-w-xl flex-col gap-4">
      {estado.error ? (
        <p className="rounded border border-vermelho-erro/40 bg-vermelho-erro/10 px-3 py-2 text-sm text-vermelho-erro">
          {estado.error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input
          name="nome"
          required
          maxLength={150}
          defaultValue={usuario?.nome ?? ""}
          className="min-h-11 rounded border border-borda px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          name="email"
          type="email"
          required
          maxLength={150}
          defaultValue={usuario?.email ?? ""}
          className="min-h-11 rounded border border-borda px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Perfil
        <select
          name="perfil"
          required
          defaultValue={usuario?.perfil ?? perfis[0] ?? ""}
          className="min-h-11 rounded border border-borda px-3 py-2"
        >
          {opcoes.map((perfil) => (
            <option key={perfil} value={perfil}>
              {rotuloPerfil(perfil)}
            </option>
          ))}
        </select>
      </label>

      {criar ? (
        <label className="flex flex-col gap-1 text-sm">
          Senha provisória
          <input
            name="senha"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="min-h-11 rounded border border-borda px-3 py-2"
          />
        </label>
      ) : null}

      <button
        type="submit"
        disabled={pendente}
        className="min-h-11 rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
