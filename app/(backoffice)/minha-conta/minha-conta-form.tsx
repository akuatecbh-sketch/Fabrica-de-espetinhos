"use client";

import { useActionState } from "react";
import { alterarMinhaSenha, type MinhaContaState } from "./actions";

const estadoInicial: MinhaContaState = {};

export function MinhaContaForm() {
  const [estado, formAction, pendente] = useActionState(
    alterarMinhaSenha,
    estadoInicial,
  );

  return (
    <form action={formAction} className="flex w-full max-w-xl flex-col gap-4">
      {estado.error ? (
        <p className="rounded border border-vermelho-erro/40 bg-vermelho-erro/10 px-3 py-2 text-sm text-vermelho-erro">
          {estado.error}
        </p>
      ) : null}
      {estado.ok ? (
        <p className="rounded border border-verde-sucesso/40 bg-verde-sucesso/10 px-3 py-2 text-sm text-verde-sucesso">
          Senha atualizada.
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Senha atual
        <input
          name="senha_atual"
          type="password"
          required
          autoComplete="current-password"
          className="min-h-11 rounded border border-borda px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
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

      <label className="flex flex-col gap-1 text-sm">
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
