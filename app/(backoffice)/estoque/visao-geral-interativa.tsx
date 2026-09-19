"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  contagensVisaoEstoque,
  type FiltroVisaoEstoque,
} from "@/lib/estoque";
import {
  ListaTodosProdutos,
  type ProdutoEstoqueVisao,
} from "./lista-todos-produtos";

const CARDS: {
  id: FiltroVisaoEstoque;
  titulo: string;
}[] = [
  { id: "todos", titulo: "Produtos" },
  { id: "minimo", titulo: "Abaixo do mínimo" },
  { id: "ideal", titulo: "Abaixo do ideal" },
  { id: "excesso", titulo: "No máximo ou excesso" },
];

export function VisaoGeralInterativa({
  produtos,
  children,
}: {
  produtos: ProdutoEstoqueVisao[];
  children: ReactNode;
}) {
  const [filtro, setFiltro] = useState<FiltroVisaoEstoque>("todos");
  const contagens = useMemo(() => contagensVisaoEstoque(produtos), [produtos]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CARDS.map((card) => {
          const ativo = filtro === card.id;
          return (
            <button
              key={card.id}
              type="button"
              aria-pressed={ativo}
              onClick={() => {
                setFiltro(card.id);
                document
                  .getElementById("todos-os-produtos")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`rounded border px-4 py-3 text-left ${
                ativo
                  ? "border-brasa bg-brasa/5"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <span className="block text-xs text-texto-secundario">
                {card.titulo}
              </span>
              <span className="font-data text-2xl font-semibold text-texto-primario">
                {contagens[card.id]}
              </span>
            </button>
          );
        })}
      </div>

      {children}

      <ListaTodosProdutos
        produtos={produtos}
        filtro={filtro}
        onVerTodos={() => setFiltro("todos")}
      />
    </div>
  );
}
