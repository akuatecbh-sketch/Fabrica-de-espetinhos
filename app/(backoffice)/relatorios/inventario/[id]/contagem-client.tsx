"use client";

import { useMemo, useState, useTransition } from "react";
import { formatarQuantidade, rotuloTipo } from "@/lib/format";
import {
  classeBadgeSituacao,
  formatarQuantidadeInventario,
  rotuloSituacaoContagem,
  situacaoContagem,
} from "@/lib/inventario";
import {
  aplicarAjusteItemAction,
  aplicarTodosAjustes,
  finalizarContagem,
  salvarItemContagem,
} from "../actions";

export type ItemContagemTela = {
  id: number;
  nome: string;
  categoria: string;
  tipo: string;
  vendidoPorPeso: boolean;
  estoqueSistema: number;
  quantidadeContada: number | null;
  diferenca: number | null;
  ajusteAplicado: boolean;
};

function textoQuantidade(valor: number | null) {
  if (valor == null) return "";
  return String(valor).replace(".", ",");
}

export function ContagemClient({
  inventarioId,
  status,
  itensIniciais,
}: {
  inventarioId: number;
  status: string;
  itensIniciais: ItemContagemTela[];
}) {
  const emAndamento = status === "em_andamento";
  const finalizado = status === "finalizado";
  const [itens, setItens] = useState(itensIniciais);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  const tipos = useMemo(() => {
    return [...new Set(itens.map((item) => item.tipo))].sort();
  }, [itens]);

  const filtrados = useMemo(() => {
    const termo = busca
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    return itens.filter((item) => {
      if (tipo !== "todos" && item.tipo !== tipo) return false;
      if (!termo) return true;
      const nome = item.nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      const categoria = item.categoria
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return nome.includes(termo) || categoria.includes(termo);
    });
  }, [busca, itens, tipo]);

  const contados = itens.filter((item) => item.quantidadeContada != null).length;
  const pendentes = itens.length - contados;
  const ajustesPendentes = itens.filter(
    (item) =>
      item.diferenca != null &&
      item.diferenca !== 0 &&
      !item.ajusteAplicado,
  ).length;

  function salvar(itemId: number, valor: string) {
    startTransition(async () => {
      const resultado = await salvarItemContagem(itemId, valor);
      if (resultado.error) {
        setErro(resultado.error);
        return;
      }
      setErro(null);
      setItens((atual) =>
        atual.map((item) => {
          if (item.id !== itemId) return item;
          const texto = valor.trim().replace(",", ".");
          const quantidade = texto ? Number(texto) : null;
          return {
            ...item,
            quantidadeContada:
              quantidade != null && Number.isFinite(quantidade)
                ? quantidade
                : null,
            diferenca:
              resultado.diferenca === undefined
                ? item.diferenca
                : resultado.diferenca,
          };
        }),
      );
    });
  }

  function finalizar() {
    if (
      pendentes > 0 &&
      !window.confirm(
        `Há ${pendentes} ${pendentes === 1 ? "item pendente" : "itens pendentes"} sem quantidade contada. Finalizar mesmo assim?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const resultado = await finalizarContagem(inventarioId);
      if (resultado.error) setErro(resultado.error);
    });
  }

  function aplicarUm(itemId: number) {
    startTransition(async () => {
      const resultado = await aplicarAjusteItemAction(itemId);
      if (resultado.error) {
        setErro(resultado.error);
        return;
      }
      setErro(null);
      setItens((atual) =>
        atual.map((item) =>
          item.id === itemId ? { ...item, ajusteAplicado: true } : item,
        ),
      );
    });
  }

  function aplicarTodos() {
    if (
      !window.confirm(
        `Aplicar ${ajustesPendentes} ${ajustesPendentes === 1 ? "ajuste" : "ajustes"} no estoque?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const resultado = await aplicarTodosAjustes(inventarioId);
      if (resultado.error) {
        setErro(resultado.error);
        return;
      }
      setErro(null);
      setItens((atual) =>
        atual.map((item) =>
          item.diferenca != null && item.diferenca !== 0
            ? { ...item, ajusteAplicado: true }
            : item,
        ),
      );
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-texto-secundario">
            {contados} de {itens.length} contados
          </p>
          <p className="font-data text-texto-primario">
            {itens.length === 0
              ? "0%"
              : `${Math.round((contados / itens.length) * 100)}%`}
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded bg-zinc-100">
          <div
            className="h-full bg-gradiente-brasa"
            style={{
              width: `${itens.length === 0 ? 0 : (contados / itens.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
          Buscar
          <input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Nome ou categoria"
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tipo
          <select
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-2"
          >
            <option value="todos">Todos</option>
            {tipos.map((opcao) => (
              <option key={opcao} value={opcao}>
                {rotuloTipo(opcao)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {erro ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      ) : null}

      {emAndamento ? (
        <button
          type="button"
          onClick={finalizar}
          disabled={pendente}
          className="self-start rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Finalizar contagem
        </button>
      ) : null}

      {finalizado && ajustesPendentes > 0 ? (
        <button
          type="button"
          onClick={aplicarTodos}
          disabled={pendente}
          className="self-start rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Aplicar todos ({ajustesPendentes})
        </button>
      ) : null}

      {filtrados.length === 0 ? (
        <p className="text-sm text-texto-secundario">
          Nenhum item corresponde à busca.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Categoria</th>
                <th className="px-3 py-2 font-medium">Sistema</th>
                <th className="px-3 py-2 font-medium">
                  Quantidade contada
                </th>
                <th className="px-3 py-2 font-medium">Diferença</th>
                {finalizado ? (
                  <th className="px-3 py-2 font-medium">Ajuste</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item) => {
                const situacao = situacaoContagem(
                  item.quantidadeContada,
                  item.diferenca,
                );
                return (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-3 py-2">
                      <p className="font-medium">{item.nome}</p>
                      <p className="text-xs text-texto-secundario">
                        {rotuloTipo(item.tipo)}
                        {item.vendidoPorPeso ? " · contagem em kg" : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-texto-secundario">
                      {item.categoria}
                    </td>
                    <td className="px-3 py-2 font-data">
                      {formatarQuantidadeInventario(
                        item.estoqueSistema,
                        item.vendidoPorPeso,
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {emAndamento ? (
                        <label className="flex flex-col gap-1">
                          {item.vendidoPorPeso ? (
                            <span className="text-xs text-texto-secundario">
                              Peso (kg)
                            </span>
                          ) : null}
                          <input
                            type="text"
                            inputMode="decimal"
                            defaultValue={textoQuantidade(item.quantidadeContada)}
                            placeholder={item.vendidoPorPeso ? "0,000" : "0"}
                            disabled={pendente}
                            onBlur={(evento) =>
                              salvar(item.id, evento.target.value)
                            }
                            className="font-data w-28 rounded border border-zinc-300 px-2 py-1"
                          />
                        </label>
                      ) : (
                        <span className="font-data">
                          {formatarQuantidadeInventario(
                            item.quantidadeContada,
                            item.vendidoPorPeso,
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${classeBadgeSituacao(situacao)}`}
                      >
                        {rotuloSituacaoContagem(situacao)}
                        {item.diferenca != null
                          ? ` · ${formatarQuantidade(item.diferenca)}`
                          : ""}
                      </span>
                    </td>
                    {finalizado ? (
                      <td className="px-3 py-2">
                        {item.diferenca == null || item.diferenca === 0 ? (
                          <span className="text-xs text-texto-secundario">
                            —
                          </span>
                        ) : item.ajusteAplicado ? (
                          <span className="text-xs font-medium text-verde-texto">
                            Aplicado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => aplicarUm(item.id)}
                            disabled={pendente}
                            className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline disabled:opacity-60"
                          >
                            Aplicar ajuste
                          </button>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
