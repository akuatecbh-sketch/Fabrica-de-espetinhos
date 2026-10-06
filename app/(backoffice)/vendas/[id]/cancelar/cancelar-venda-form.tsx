"use client";

import { useActionState, useMemo, useState } from "react";
import { formatarPreco, formatarQuantidade } from "@/lib/format";
import {
  cancelarVendaFinalizadaFormAction,
  type CancelarVendaFinalizadaState,
} from "../../actions";

type ItemDevolvivel = {
  produto_id: number;
  nome: string;
  quantidade_vendida: number;
  quantidade_devolvivel: number;
};

const estadoInicial: CancelarVendaFinalizadaState = {};

type ItemForm = {
  produto_id: number;
  nome: string;
  devolvivel: number;
  marcado: boolean;
  quantidade: string;
};

function textoQuantidade(valor: number) {
  return String(valor);
}

export function CancelarVendaForm({
  vendaId,
  numero,
  total,
  itens,
  valorDinheiro,
  temCaixaAberto,
  notaBloqueada,
}: {
  vendaId: number;
  numero: number;
  total: number;
  itens: ItemDevolvivel[];
  valorDinheiro: number;
  temCaixaAberto: boolean;
  notaBloqueada: boolean;
}) {
  const [estado, formAction, pendente] = useActionState(
    cancelarVendaFinalizadaFormAction,
    estadoInicial,
  );
  const devolviveis = itens.filter((item) => item.quantidade_devolvivel > 0);
  const semEstoque = itens.filter((item) => item.quantidade_devolvivel <= 0);
  const [linhas, setLinhas] = useState<ItemForm[]>(() =>
    devolviveis.map((item) => ({
      produto_id: item.produto_id,
      nome: item.nome,
      devolvivel: item.quantidade_devolvivel,
      marcado: true,
      quantidade: textoQuantidade(item.quantidade_devolvivel),
    })),
  );
  const [devolverDinheiro, setDevolverDinheiro] = useState(
    valorDinheiro > 0 && temCaixaAberto,
  );
  const [motivo, setMotivo] = useState("");

  const qtdItens = linhas.filter((linha) => {
    const quantidade = Number(linha.quantidade.replace(",", "."));
    return linha.marcado && quantidade > 0;
  }).length;
  const estorno = devolverDinheiro && valorDinheiro > 0 ? valorDinheiro : 0;
  const motivoCurto = motivo.trim().length > 0 && motivo.trim().length < 5;
  const podeEnviar =
    !notaBloqueada && !pendente && motivo.trim().length >= 5;

  const resumo = useMemo(() => {
    return `Você vai cancelar a venda #${numero} de ${formatarPreco(total)}, devolver ${qtdItens} ${qtdItens === 1 ? "item" : "itens"} ao estoque e estornar ${formatarPreco(estorno)} em dinheiro.`;
  }, [numero, total, qtdItens, estorno]);

  function devolverTudo() {
    setLinhas((atual) =>
      atual.map((linha) => ({
        ...linha,
        marcado: true,
        quantidade: textoQuantidade(linha.devolvivel),
      })),
    );
  }

  function naoDevolverNada() {
    setLinhas((atual) =>
      atual.map((linha) => ({ ...linha, marcado: false })),
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="vendaId" value={vendaId} />

      {estado.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-zinc-900">
            Devolução ao estoque
          </h2>
          {devolviveis.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={devolverTudo}
                className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
              >
                Devolver tudo
              </button>
              <button
                type="button"
                onClick={naoDevolverNada}
                className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
              >
                Não devolver nada
              </button>
            </div>
          ) : null}
        </div>

        {linhas.length === 0 && semEstoque.length === 0 ? (
          <p className="text-sm text-texto-secundario">
            Nenhum item nesta venda.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {linhas.map((linha, indice) => (
              <li
                key={linha.produto_id}
                className="flex flex-col gap-2 rounded border border-zinc-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="devolver"
                    value={linha.produto_id}
                    checked={linha.marcado}
                    onChange={(evento) => {
                      const marcado = evento.target.checked;
                      setLinhas((atual) =>
                        atual.map((item, i) =>
                          i === indice ? { ...item, marcado } : item,
                        ),
                      );
                    }}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">{linha.nome}</span>
                    <span className="block text-xs text-texto-secundario">
                      Devolvível: {formatarQuantidade(linha.devolvivel)}
                    </span>
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  Quantidade
                  <input
                    type="number"
                    name={`qtd_${linha.produto_id}`}
                    min={0}
                    max={linha.devolvivel}
                    step="0.001"
                    value={linha.quantidade}
                    disabled={!linha.marcado}
                    onChange={(evento) => {
                      const quantidade = evento.target.value;
                      setLinhas((atual) =>
                        atual.map((item, i) =>
                          i === indice ? { ...item, quantidade } : item,
                        ),
                      );
                    }}
                    className="w-28 rounded border border-zinc-300 px-2 py-1.5 font-data disabled:bg-zinc-50"
                  />
                </label>
              </li>
            ))}
            {semEstoque.map((item) => (
              <li
                key={item.produto_id}
                className="rounded border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm"
              >
                <p className="font-medium">{item.nome}</p>
                <p className="text-xs text-texto-secundario">
                  Não baixou estoque
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {valorDinheiro > 0 ? (
        <section className="flex flex-col gap-2">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="devolver_dinheiro"
              value="1"
              checked={devolverDinheiro}
              disabled={!temCaixaAberto}
              onChange={(evento) => setDevolverDinheiro(evento.target.checked)}
              className="mt-1"
            />
            <span>
              Devolvi o dinheiro da gaveta ({formatarPreco(valorDinheiro)})
            </span>
          </label>
          {!temCaixaAberto ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Abra o caixa para devolver dinheiro.
            </p>
          ) : null}
        </section>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Motivo
        <textarea
          name="motivo"
          required
          minLength={5}
          rows={3}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          className="rounded border border-zinc-300 px-3 py-2"
          placeholder="Descreva o motivo do cancelamento"
        />
        {motivoCurto ? (
          <span className="text-xs text-red-700">
            Informe pelo menos 5 caracteres.
          </span>
        ) : null}
      </label>

      <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
        {resumo}
      </p>

      <button
        type="submit"
        disabled={!podeEnviar}
        className="min-h-11 rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
      >
        {pendente ? "Cancelando..." : "Confirmar cancelamento"}
      </button>
    </form>
  );
}
