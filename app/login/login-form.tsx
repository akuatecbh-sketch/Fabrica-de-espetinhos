"use client";

import { useActionState } from "react";
import { autenticar, type LoginState } from "./actions";

const estadoInicial: LoginState = {};

export function LoginForm() {
  const [estado, formAction, pendente] = useActionState(
    autenticar,
    estadoInicial,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      {estado.error ? (
        <p className="rounded border border-vermelho-erro/40 bg-vermelho-erro/10 px-3 py-2 text-sm text-vermelho-erro">
          {estado.error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm text-texto-primario">
        E-mail
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="min-h-11 rounded border border-borda px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-texto-primario">
        Senha
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-11 rounded border border-borda px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={pendente}
        className="min-h-11 rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
