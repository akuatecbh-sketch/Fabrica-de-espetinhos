"use client";

import { useEffect, useState, useTransition } from "react";
import { rotuloPerfil } from "@/lib/acesso";
import { salvarPermissaoPerfil } from "./actions";

type ModuloGrade = {
  id: number;
  nome: string;
};

export function GradePermissoes({
  modulos,
  perfis,
  matriz,
}: {
  modulos: ModuloGrade[];
  perfis: readonly string[];
  matriz: Record<string, Record<number, boolean>>;
}) {
  const [valores, setValores] = useState(matriz);
  const [status, setStatus] = useState<Record<string, "salvando" | "salvo" | "erro">>({});
  const [, startTransition] = useTransition();

  useEffect(() => {
    setValores(matriz);
  }, [matriz]);

  function chaveCelula(perfil: string, moduloId: number) {
    return `${perfil}:${moduloId}`;
  }

  function alternar(perfil: string, moduloId: number, marcado: boolean) {
    const chave = chaveCelula(perfil, moduloId);
    setValores((atual) => ({
      ...atual,
      [perfil]: { ...atual[perfil], [moduloId]: marcado },
    }));
    setStatus((atual) => ({ ...atual, [chave]: "salvando" }));

    startTransition(async () => {
      const resultado = await salvarPermissaoPerfil(moduloId, perfil, marcado);
      setStatus((atual) => ({
        ...atual,
        [chave]: resultado.error ? "erro" : "salvo",
      }));
      if (resultado.error) {
        setValores((atual) => ({
          ...atual,
          [perfil]: { ...atual[perfil], [moduloId]: !marcado },
        }));
      }
      window.setTimeout(() => {
        setStatus((atual) => {
          const proximo = { ...atual };
          if (proximo[chave] === "salvo") delete proximo[chave];
          return proximo;
        });
      }, 1600);
    });
  }

  return (
    <div className="overflow-x-auto rounded border border-borda bg-superficie">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-borda bg-fundo text-texto-secundario">
          <tr>
            <th className="px-3 py-2 font-medium">Módulo</th>
            {perfis.map((perfil) => (
              <th key={perfil} className="px-3 py-2 text-center font-medium">
                {rotuloPerfil(perfil)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modulos.map((modulo) => (
            <tr
              key={modulo.id}
              className="border-b border-borda last:border-0"
            >
              <th className="px-3 py-2 font-medium text-texto-primario">
                {modulo.nome}
              </th>
              {perfis.map((perfil) => {
                const chave = chaveCelula(perfil, modulo.id);
                const marcado = Boolean(valores[perfil]?.[modulo.id]);
                const estado = status[chave];
                return (
                  <td key={perfil} className="px-3 py-2 text-center">
                    <label className="inline-flex flex-col items-center gap-1">
                      <span className="sr-only">
                        {modulo.nome} para {rotuloPerfil(perfil)}
                      </span>
                      <input
                        type="checkbox"
                        checked={marcado}
                        disabled={estado === "salvando"}
                        onChange={(evento) =>
                          alternar(perfil, modulo.id, evento.target.checked)
                        }
                        className="h-4 w-4 rounded border-borda"
                      />
                      <span
                        className={`h-4 text-[10px] leading-4 ${
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
                    </label>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
