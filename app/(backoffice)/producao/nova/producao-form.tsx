"use client";

import { useActionState, useEffect, useState } from "react";
import { formatarPreco, formatarQuantidade } from "@/lib/format";
import {
  registrarProducaoFormAction,
  type ProducaoFormState,
} from "../actions";

type ProdutoOpcao = {
  id: number;
  nome: string;
  unidade: string;
  temFicha: boolean;
};

const estadoInicial: ProducaoFormState = {};

export function ProducaoForm({
  produtos,
  produtoIdInicial,
  quantidadeInicial,
  dataInicial,
}: {
  produtos: ProdutoOpcao[];
  produtoIdInicial: number | null;
  quantidadeInicial: string;
  dataInicial: string;
}) {
  const [estado, formAction, pendente] = useActionState(
    registrarProducaoFormAction,
    estadoInicial,
  );
  const [token] = useState(() => crypto.randomUUID());
  const [produtoId, setProdutoId] = useState(
    produtoIdInicial != null ? String(produtoIdInicial) : "",
  );
  const [quantidade, setQuantidade] = useState(quantidadeInicial);
  const [previaVisivel, setPreviaVisivel] = useState(false);
  const [confirmouNegativo, setConfirmouNegativo] = useState(false);

  const selecionado = produtos.find((item) => String(item.id) === produtoId);
  const semFicha = Boolean(selecionado && !selecionado.temFicha);

  useEffect(() => {
    setPreviaVisivel(false);
    setConfirmouNegativo(false);
  }, [produtoId, quantidade]);

  useEffect(() => {
    if (estado.previa) setPreviaVisivel(true);
  }, [estado.previa]);

  const previa = estado.previa;
  const mostrarPrevia = previaVisivel && previa;

  return (
    <form action={formAction} className="flex w-full max-w-2xl flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      {estado.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      ) : null}

      {semFicha ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Este produto não tem ficha técnica. Cadastre a ficha em Produtos
          antes de produzir.
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Produto final
        <select
          name="produto_id"
          required
          value={produtoId}
          onChange={(evento) => setProdutoId(evento.target.value)}
          className="rounded border border-zinc-300 px-3 py-2"
        >
          <option value="">Selecione</option>
          {produtos.map((produto) => (
            <option key={produto.id} value={produto.id}>
              {produto.nome}
              {produto.temFicha ? "" : " (sem ficha)"}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Quantidade produzida
        {selecionado ? (
          <span className="text-xs text-texto-secundario">
            Unidade: {selecionado.unidade}
          </span>
        ) : null}
        <input
          name="quantidade"
          inputMode="decimal"
          required
          value={quantidade}
          onChange={(evento) => setQuantidade(evento.target.value)}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Data
        <input
          type="date"
          name="data"
          required
          defaultValue={dataInicial}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Observação
        <textarea
          name="observacao"
          rows={3}
          maxLength={500}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="intencao"
          value="previa"
          disabled={pendente || semFicha}
          className="min-h-11 rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
        >
          {pendente ? "Calculando…" : "Calcular prévia"}
        </button>
      </div>

      {mostrarPrevia ? (
        <section className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
          <h2 className="text-sm font-medium text-zinc-900">
            Prévia dos insumos
            {estado.produtoNome ? ` — ${estado.produtoNome}` : ""}
          </h2>
          <p className="mt-1 text-sm text-texto-secundario">
            Quantidade a produzir: {formatarQuantidade(previa.quantidadeProduzida)}{" "}
            {estado.unidade ?? selecionado?.unidade ?? ""}
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-zinc-600">
                <tr>
                  <th className="py-2 pr-3 font-medium">Insumo</th>
                  <th className="py-2 pr-3 font-medium">Baixa</th>
                  <th className="py-2 pr-3 font-medium">Saldo atual</th>
                  <th className="py-2 font-medium">Saldo depois</th>
                </tr>
              </thead>
              <tbody>
                {previa.linhas.map((linha) => (
                  <tr key={linha.insumoId} className="border-b border-zinc-100">
                    <td className="py-2 pr-3">
                      {linha.nome}
                      {!linha.controlaEstoque ? (
                        <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs text-texto-secundario">
                          não controlado
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 font-data">
                      {formatarQuantidade(linha.quantidadeBaixa)} {linha.unidade}
                    </td>
                    <td className="py-2 pr-3 font-data">
                      {linha.controlaEstoque
                        ? `${formatarQuantidade(linha.saldoAtual)} ${linha.unidade}`
                        : "—"}
                    </td>
                    <td className="py-2 font-data">
                      {linha.controlaEstoque ? (
                        <span
                          className={
                            linha.saldoDepois != null && linha.saldoDepois < 0
                              ? "text-red-700"
                              : undefined
                          }
                        >
                          {formatarQuantidade(linha.saldoDepois)} {linha.unidade}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-sm">
            Custo dos insumos (snapshot):{" "}
            <span className="font-data">{formatarPreco(previa.custoTotal)}</span>
          </p>

          {previa.temSaldoNegativo ? (
            <label className="mt-3 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <input
                type="checkbox"
                name="confirmar_negativo"
                className="mt-1"
                checked={confirmouNegativo}
                onChange={(evento) => setConfirmouNegativo(evento.target.checked)}
              />
              <span>
                Há insumo que ficará com saldo negativo. Confirmo a produção
                mesmo assim (o estoque pode estar desalinhado).
              </span>
            </label>
          ) : null}

          <button
            type="submit"
            name="intencao"
            value="confirmar"
            disabled={
              pendente ||
              semFicha ||
              (previa.temSaldoNegativo && !confirmouNegativo)
            }
            className="mt-4 min-h-11 rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pendente ? "Registrando…" : "Confirmar produção"}
          </button>
        </section>
      ) : null}
    </form>
  );
}
