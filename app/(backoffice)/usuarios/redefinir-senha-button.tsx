"use client";

import { useActionState, useState } from "react";
import { redefinirSenhaUsuario, type UsuarioFormState } from "./actions";

const estadoInicial: UsuarioFormState = {};

export function RedefinirSenhaButton({
  id,
  nome,
}: {
  id: number;
  nome: string;
}) {
  const [aberto, setAberto] = useState(false);
  const acao = redefinirSenhaUsuario.bind(null, id);
  const [estado, formAction, pendente] = useActionState(acao, estadoInicial);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex min-h-11 items-center text-texto-primario underline-offset-2 hover:underline md:min-h-0"
      >
        Redefinir senha
      </button>
    );
  }

  return (
    <form action={formAction} className="flex min-w-44 flex-col gap-2">
      {estado.error ? (
        <p className="text-xs text-vermelho-erro">{estado.error}</p>
      ) : null}
      <label className="sr-only" htmlFor={`senha-${id}`}>
        Nova senha provisória de {nome}
      </label>
      <input
        id={`senha-${id}`}
        name="senha"
        type="password"
        required
        minLength={6}
        placeholder="Nova senha provisória"
        autoComplete="new-password"
        className="min-h-11 rounded border border-borda px-2 py-1 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pendente}
          className="min-h-11 rounded bg-gradiente-brasa px-3 py-1 text-sm font-medium text-white disabled:opacity-60 md:min-h-0"
        >
          {pendente ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="min-h-11 text-sm text-texto-secundario hover:underline md:min-h-0"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
