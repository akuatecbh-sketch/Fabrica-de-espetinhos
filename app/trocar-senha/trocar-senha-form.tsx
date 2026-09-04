"use client";

import { useActionState } from "react";
import { trocarSenhaProvisoria, type TrocarSenhaState } from "./actions";

const estadoInicial: TrocarSenhaState = {};

export function TrocarSenhaForm() {
  const [estado, formAction, pendente] = useActionState(
    trocarSenhaProvisoria,
    estadoInicial,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      {estado.error ? (
        <p className="rounded border border-vermelho-erro/40 bg-vermelho-erro/10 px-3 py-2 text-sm text-vermelho-erro">
          {estado.error}
        </p>
      ) : null}

      <p className="text-sm text-texto-secundario">
        Esta senha é provisória. Defina uma senha nova para continuar.
      </p>

      <label className="flex flex-col gap-1 text-sm text-texto-primario">
        Nova senha
        <input
          name="senha"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="min-h-11 rounded border border-borda px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-texto-primario">
        Confirmar nova senha
        <input
          name="confirmacao"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="min-h-11 rounded border border-borda px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={pendente}
        className="min-h-11 rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Salvando..." : "Salvar senha"}
      </button>
    </form>
  );
}
