"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { rotuloTipo } from "@/lib/format";
import {
  TIPOS_CATEGORIA_FINANCEIRA,
  ehTipoCategoriaPagar,
} from "@/lib/financeiro";
import {
  criarCategoriaFinanceira,
  excluirCategoriaFinanceira,
  listarCategoriasFinanceirasComUso,
  type CategoriaFinanceiraComUso,
  type CategoriaFinanceiraOpcao,
} from "./categoria-actions";

const OPCAO_NOVA = "__nova__";

export function CategoriaFinanceiraCampo({
  categoriasIniciais,
  valorInicial,
}: {
  categoriasIniciais: CategoriaFinanceiraOpcao[];
  valorInicial?: number;
}) {
  const [categorias, setCategorias] = useState(
    categoriasIniciais.filter((categoria) =>
      ehTipoCategoriaPagar(categoria.tipo),
    ),
  );
  const [categoriaId, setCategoriaId] = useState(
    valorInicial != null ? String(valorInicial) : "",
  );
  const [mostrarNova, setMostrarNova] = useState(false);
  const [nomeNova, setNomeNova] = useState("");
  const [tipoNova, setTipoNova] = useState("");
  const [erroNova, setErroNova] = useState<string | null>(null);
  const [gerenciarAberto, setGerenciarAberto] = useState(false);
  const [listaUso, setListaUso] = useState<CategoriaFinanceiraComUso[]>([]);
  const [erroGerenciar, setErroGerenciar] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const [noCliente, setNoCliente] = useState(false);

  useEffect(() => {
    setNoCliente(true);
  }, []);

  function aoMudarSelect(valor: string) {
    if (valor === OPCAO_NOVA) {
      setMostrarNova(true);
      setErroNova(null);
      return;
    }
    setCategoriaId(valor);
  }

  function salvarNova() {
    startTransition(async () => {
      const resultado = await criarCategoriaFinanceira(nomeNova, tipoNova);
      if (resultado.error || !resultado.categoria) {
        setErroNova(resultado.error ?? "Não foi possível criar a categoria.");
        return;
      }
      const criada = resultado.categoria;
      if (ehTipoCategoriaPagar(criada.tipo)) {
        setCategorias((atuais) =>
          [...atuais, criada].sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR"),
          ),
        );
        setCategoriaId(String(criada.id));
      } else {
        setErroNova(
          "Categoria de receita criada. Escolha uma categoria de custo para esta conta a pagar.",
        );
      }
      setMostrarNova(false);
      setNomeNova("");
      setTipoNova("");
      if (ehTipoCategoriaPagar(criada.tipo)) setErroNova(null);
    });
  }

  function abrirGerenciar() {
    setErroGerenciar(null);
    setGerenciarAberto(true);
    startTransition(async () => {
      setListaUso(await listarCategoriasFinanceirasComUso());
    });
  }

  function pedirExclusao(categoria: CategoriaFinanceiraComUso) {
    if (categoria.contas > 0) {
      setErroGerenciar(
        `Não é possível excluir: ${categoria.contas} conta(s) a pagar usam esta categoria. Troque a categoria dessas contas antes.`,
      );
      return;
    }
    if (
      !confirm(`Tem certeza que deseja excluir a categoria ${categoria.nome}?`)
    ) {
      return;
    }
    startTransition(async () => {
      const resultado = await excluirCategoriaFinanceira(categoria.id);
      if (resultado.error) {
        setErroGerenciar(resultado.error);
        return;
      }
      setListaUso((atuais) =>
        atuais.filter((item) => item.id !== categoria.id),
      );
      setCategorias((atuais) =>
        atuais.filter((item) => item.id !== categoria.id),
      );
      if (categoriaId === String(categoria.id)) setCategoriaId("");
      setErroGerenciar(null);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          Categoria financeira
          <select
            name="categoria_id"
            required
            value={categoriaId}
            onChange={(evento) => aoMudarSelect(evento.target.value)}
            className="rounded border border-zinc-300 px-3 py-2"
          >
            <option value="">Selecione</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome} ({rotuloTipo(categoria.tipo)})
              </option>
            ))}
            <option value={OPCAO_NOVA}>+ Adicionar nova categoria</option>
          </select>
        </label>
        <button
          type="button"
          onClick={abrirGerenciar}
          className="shrink-0 pb-2 text-sm text-zinc-600 hover:underline"
        >
          Gerenciar categorias
        </button>
      </div>

      {mostrarNova ? (
        <div
          className="flex flex-col gap-3 rounded border border-zinc-200 bg-zinc-50 p-3"
          onKeyDown={(evento) => {
            if (evento.key === "Enter") evento.preventDefault();
          }}
        >
          <p className="text-sm font-medium">Nova categoria</p>
          {erroNova ? (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erroNova}
            </p>
          ) : null}
          <label className="flex flex-col gap-1 text-sm">
            Nome da categoria
            <input
              value={nomeNova}
              maxLength={80}
              onChange={(evento) => setNomeNova(evento.target.value)}
              className="rounded border border-zinc-300 bg-white px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Tipo
            <select
              value={tipoNova}
              onChange={(evento) => setTipoNova(evento.target.value)}
              className="rounded border border-zinc-300 bg-white px-3 py-2"
            >
              <option value="">Selecione</option>
              {TIPOS_CATEGORIA_FINANCEIRA.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {rotuloTipo(tipo)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={pendente}
              onClick={salvarNova}
              className="rounded bg-gradiente-brasa px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {pendente ? "Salvando..." : "Salvar categoria"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarNova(false);
                setErroNova(null);
              }}
              className="text-sm text-zinc-600 hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : erroNova ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erroNova}
        </p>
      ) : null}

      {gerenciarAberto && noCliente
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
              <div className="mt-8 w-full max-w-lg rounded border border-zinc-200 bg-white p-5 shadow-lg">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-medium">
                    Gerenciar categorias financeiras
                  </h2>
                  <button
                    type="button"
                    onClick={() => setGerenciarAberto(false)}
                    className="text-sm text-zinc-600 hover:underline"
                  >
                    Fechar
                  </button>
                </div>
                {erroGerenciar ? (
                  <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {erroGerenciar}
                  </p>
                ) : null}
                {listaUso.length === 0 ? (
                  <p className="text-sm text-zinc-600">
                    Nenhuma categoria cadastrada.
                  </p>
                ) : (
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-zinc-200 text-zinc-600">
                      <tr>
                        <th className="py-2 pr-3 font-medium">Nome</th>
                        <th className="py-2 pr-3 font-medium">Tipo</th>
                        <th className="py-2 pr-3 font-medium">Contas</th>
                        <th className="py-2 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaUso.map((categoria) => (
                        <tr
                          key={categoria.id}
                          className="border-b border-zinc-100 last:border-0"
                        >
                          <td className="py-2 pr-3">{categoria.nome}</td>
                          <td className="py-2 pr-3">
                            {rotuloTipo(categoria.tipo)}
                          </td>
                          <td className="py-2 pr-3">{categoria.contas}</td>
                          <td className="py-2">
                            <button
                              type="button"
                              disabled={pendente}
                              onClick={() => pedirExclusao(categoria)}
                              className="text-red-700 hover:underline disabled:opacity-60"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
