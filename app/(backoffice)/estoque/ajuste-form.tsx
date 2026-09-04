"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { formatarQuantidade, rotuloTipo } from "@/lib/format";
import { TIPOS_AJUSTE, rotuloTipoMovimentacao } from "@/lib/estoque";
import { ajustarEstoque, type AjusteFormState } from "./actions";

const estadoInicial: AjusteFormState = {};

export type ProdutoAjuste = {
  id: number;
  nome: string;
  tipo: string;
  unidade: string;
  estoque_atual: number;
};

export function AjusteForm({ produtos }: { produtos: ProdutoAjuste[] }) {
  const [estado, formAction, pendente] = useActionState(
    ajustarEstoque,
    estadoInicial,
  );
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<ProdutoAjuste | null>(null);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return [];
    return produtos
      .filter((produto) => produto.nome.toLowerCase().includes(termo))
      .slice(0, 20);
  }, [busca, produtos]);

  return (
    <form action={formAction} className="flex w-full max-w-xl flex-col gap-4">
      {estado.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      ) : null}

      {estado.sucesso ? (
        <div className="rounded border border-verde-sucesso/40 bg-verde-sucesso/10 px-3 py-3 text-sm">
          <p className="font-medium text-texto-primario">Ajuste registrado</p>
          <p className="mt-1 text-texto-secundario">{estado.sucesso.produto}</p>
          <p className="font-data mt-1">
            {formatarQuantidade(estado.sucesso.saldoAnterior)} →{" "}
            {formatarQuantidade(estado.sucesso.saldoAtual)}
          </p>
          <Link
            href="/estoque?aba=movimentacoes"
            className="mt-2 inline-block text-texto-primario underline-offset-2 hover:underline"
          >
            Ver movimentações
          </Link>
        </div>
      ) : null}

      {selecionado ? (
        <input type="hidden" name="produto_id" value={selecionado.id} />
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Buscar produto
        <input
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Nome do produto"
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      {selecionado ? (
        <p className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm">
          <span className="font-medium">{selecionado.nome}</span>
          <span className="ml-2 text-texto-secundario">
            {rotuloTipo(selecionado.tipo)} · saldo{" "}
            {formatarQuantidade(selecionado.estoque_atual)} {selecionado.unidade}
          </span>
          <button
            type="button"
            onClick={() => {
              setSelecionado(null);
              setBusca("");
            }}
            className="ml-3 text-texto-secundario underline-offset-2 hover:underline"
          >
            Trocar
          </button>
        </p>
      ) : busca.trim() ? (
        filtrados.length === 0 ? (
          <p className="text-sm text-texto-secundario">Nenhum produto encontrado.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded border border-zinc-200 bg-white">
            {filtrados.map((produto) => (
              <li
                key={produto.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block font-medium">{produto.nome}</span>
                  <span className="text-xs text-texto-secundario">
                    {rotuloTipo(produto.tipo)} ·{" "}
                    {formatarQuantidade(produto.estoque_atual)} {produto.unidade}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelecionado(produto);
                    setBusca("");
                  }}
                  className="shrink-0 text-sm text-texto-primario underline-offset-2 hover:underline"
                >
                  Selecionar
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="text-sm text-texto-secundario">
          Digite o nome para buscar um produto ativo.
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Tipo de ajuste
        <select
          name="tipo"
          required
          className="rounded border border-zinc-300 bg-white px-3 py-2"
        >
          {TIPOS_AJUSTE.map((tipo) => (
            <option key={tipo} value={tipo}>
              {rotuloTipoMovimentacao(tipo)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Quantidade
        <input
          name="quantidade"
          type="number"
          required
          min="0.001"
          step="0.001"
          className="font-data rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Motivo (obrigatório)
        <textarea
          name="observacao"
          required
          maxLength={500}
          rows={3}
          placeholder="Ex: contagem física divergente, produto vencido"
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={pendente || !selecionado}
        className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Salvando..." : "Registrar ajuste"}
      </button>
    </form>
  );
}
