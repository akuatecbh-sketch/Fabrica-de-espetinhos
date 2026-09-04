"use client";

import { useEffect, useState, useTransition } from "react";
import { salvarPermissaoUsuario } from "./permissoes-actions";

type Linha = {
  moduloId: number;
  nome: string;
  padraoPerfil: boolean;
  excecao: boolean | null;
};

function valorDoSelect(excecao: boolean | null) {
  if (excecao === true) return "liberar";
  if (excecao === false) return "bloquear";
  return "padrao";
}

export function PermissoesIndividuais({
  usuarioId,
  linhas,
}: {
  usuarioId: number;
  linhas: Linha[];
}) {
  const [valores, setValores] = useState(
    Object.fromEntries(
      linhas.map((linha) => [linha.moduloId, valorDoSelect(linha.excecao)]),
    ),
  );
  const [status, setStatus] = useState<Record<number, "salvando" | "salvo" | "erro">>({});
  const [, startTransition] = useTransition();

  useEffect(() => {
    setValores(
      Object.fromEntries(
        linhas.map((linha) => [linha.moduloId, valorDoSelect(linha.excecao)]),
      ),
    );
  }, [linhas]);

  function alterar(moduloId: number, estado: "padrao" | "liberar" | "bloquear") {
    const anterior = valores[moduloId];
    setValores((atual) => ({ ...atual, [moduloId]: estado }));
    setStatus((atual) => ({ ...atual, [moduloId]: "salvando" }));

    startTransition(async () => {
      const resultado = await salvarPermissaoUsuario(usuarioId, moduloId, estado);
      setStatus((atual) => ({
        ...atual,
        [moduloId]: resultado.error ? "erro" : "salvo",
      }));
      if (resultado.error) {
        setValores((atual) => ({ ...atual, [moduloId]: anterior }));
      }
      window.setTimeout(() => {
        setStatus((atual) => {
          const proximo = { ...atual };
          if (proximo[moduloId] === "salvo") delete proximo[moduloId];
          return proximo;
        });
      }, 1600);
    });
  }

  return (
    <section className="flex max-w-xl flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Permissões individuais
        </h2>
        <p className="mt-1 text-sm text-texto-secundario">
          Exceções só para este usuário. Elas vencem o padrão do perfil.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {linhas.map((linha) => {
          const estado = status[linha.moduloId];
          return (
            <li
              key={linha.moduloId}
              className="rounded border border-borda px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-texto-primario">
                  {linha.nome}
                </p>
                <span
                  className={`text-xs ${
                    estado === "salvo"
                      ? "text-verde-texto"
                      : estado === "erro"
                        ? "text-vermelho-erro"
                        : estado === "salvando"
                          ? "text-texto-secundario"
                          : "text-transparent"
                  }`}
                >
                  {estado === "salvo"
                    ? "salvo"
                    : estado === "erro"
                      ? "erro"
                      : estado === "salvando"
                        ? "…"
                        : "salvo"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-texto-secundario">
                Padrão do perfil:{" "}
                {linha.padraoPerfil ? "com acesso" : "sem acesso"}
              </p>
              <select
                value={valores[linha.moduloId] ?? "padrao"}
                disabled={estado === "salvando"}
                onChange={(evento) =>
                  alterar(
                    linha.moduloId,
                    evento.target.value as "padrao" | "liberar" | "bloquear",
                  )
                }
                className="mt-2 min-h-11 w-full rounded border border-borda px-3 py-2 text-sm"
              >
                <option value="padrao">Padrão do perfil</option>
                <option value="liberar">Liberar</option>
                <option value="bloquear">Bloquear</option>
              </select>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
