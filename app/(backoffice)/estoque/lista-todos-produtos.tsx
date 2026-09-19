"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  produtoNoFiltroVisao,
  type FiltroVisaoEstoque,
} from "@/lib/estoque";
import { formatarQuantidade, rotuloTipo } from "@/lib/format";
import { CardRegistro } from "../card-registro";

export type ProdutoEstoqueVisao = {
  id: number;
  nome: string;
  codigo: string | null;
  tipo: string;
  estoque_atual: number;
  estoque_minimo: number;
  estoque_ideal: number | null;
  estoque_maximo: number | null;
  unidade: string;
};

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const ROTULO_FILTRO: Record<FiltroVisaoEstoque, string> = {
  todos: "Produtos",
  minimo: "Abaixo do mínimo",
  ideal: "Abaixo do ideal",
  excesso: "No máximo ou excesso",
};

export function ListaTodosProdutos({
  produtos,
  filtro,
  onVerTodos,
}: {
  produtos: ProdutoEstoqueVisao[];
  filtro: FiltroVisaoEstoque;
  onVerTodos: () => void;
}) {
  const [busca, setBusca] = useState("");
  const filtrados = useMemo(() => {
    const doCard = produtos.filter((produto) =>
      produtoNoFiltroVisao(produto, filtro),
    );
    const termo = normalizar(busca.trim());
    if (!termo) return doCard;
    return doCard.filter((produto) => {
      const nome = normalizar(produto.nome);
      const codigo = normalizar(produto.codigo ?? "");
      return nome.includes(termo) || codigo.includes(termo);
    });
  }, [busca, filtro, produtos]);

  return (
    <section id="todos-os-produtos" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">Todos os produtos</h2>
        {filtro !== "todos" ? (
          <button
            type="button"
            onClick={onVerTodos}
            className="min-h-11 rounded border border-zinc-300 px-3 py-1.5 text-sm text-texto-primario hover:bg-zinc-50"
          >
            Ver todos
          </button>
        ) : null}
      </div>
      {filtro !== "todos" ? (
        <p className="text-sm text-texto-secundario">
          Filtro: {ROTULO_FILTRO[filtro]}
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        Buscar
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-secundario"
            aria-hidden
          />
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Nome ou código"
            autoComplete="off"
            className="min-h-11 w-full rounded border border-zinc-300 py-2 pl-10 pr-3 text-sm"
          />
        </div>
      </label>

      {filtrados.length === 0 ? (
        <p className="text-sm text-texto-secundario">
          {busca.trim() || filtro !== "todos"
            ? "Nenhum produto encontrado."
            : "Nenhum produto ativo."}
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-3 md:hidden">
            {filtrados.map((item) => (
              <li key={item.id}>
                <CardRegistro
                  acoes={
                    <Link
                      href={`/produtos/${item.id}/editar`}
                      className="inline-flex min-h-11 items-center text-texto-primario underline-offset-2 hover:underline"
                    >
                      Ver produto
                    </Link>
                  }
                >
                  <p className="font-medium text-texto-primario">{item.nome}</p>
                  <p className="text-xs text-texto-secundario">
                    {rotuloTipo(item.tipo)}
                    {item.codigo ? ` · ${item.codigo}` : ""}
                  </p>
                  <p className="font-data text-sm">
                    {formatarQuantidade(item.estoque_atual)} /{" "}
                    {formatarQuantidade(item.estoque_minimo)} {item.unidade}
                  </p>
                </CardRegistro>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Produto</th>
                  <th className="px-3 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Atual / mínimo</th>
                  <th className="px-3 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-3 py-2">{item.nome}</td>
                    <td className="px-3 py-2 font-data">{item.codigo || "—"}</td>
                    <td className="px-3 py-2">{rotuloTipo(item.tipo)}</td>
                    <td className="px-3 py-2 font-data">
                      {formatarQuantidade(item.estoque_atual)} /{" "}
                      {formatarQuantidade(item.estoque_minimo)} {item.unidade}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/produtos/${item.id}/editar`}
                        className="text-texto-primario underline-offset-2 hover:underline"
                      >
                        Ver produto
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
