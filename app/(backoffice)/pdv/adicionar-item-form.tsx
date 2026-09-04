"use client";

import { useActionState, useMemo, useState } from "react";
import { adicionarItem, type PdvFormState } from "./actions";
import { arredondarDinheiro, arredondarQuantidade } from "@/lib/dinheiro";
import { formatarPreco, formatarQuantidade } from "@/lib/format";

const estadoInicial: PdvFormState = {};

type ProdutoBusca = {
  id: number;
  nome: string;
  codigo: string | null;
  preco_venda: string | null;
  unidade: string;
  permite_venda_pacote: boolean;
  quantidade_por_pacote: string;
  preco_pacote: string | null;
};

export function AdicionarItemForm({
  vendaId,
  produto,
}: {
  vendaId: number;
  produto: ProdutoBusca;
}) {
  const [estado, formAction, pendente] = useActionState(
    adicionarItem,
    estadoInicial,
  );
  const [modo, setModo] = useState<"unidade" | "pacote">("unidade");
  const [quantidadePacotes, setQuantidadePacotes] = useState("1");

  const porPacote = Number(produto.quantidade_por_pacote);
  const precoPacote = produto.preco_pacote == null ? null : Number(produto.preco_pacote);
  const pacotesInformados = Number(quantidadePacotes.replace(",", "."));
  const pacotesValidos =
    Number.isInteger(pacotesInformados) && pacotesInformados >= 1;
  const previewPacote = useMemo(() => {
    if (!pacotesValidos || precoPacote == null || !Number.isFinite(porPacote)) {
      return null;
    }
    return {
      unidades: arredondarQuantidade(pacotesInformados * porPacote),
      subtotal: arredondarDinheiro(pacotesInformados * precoPacote),
    };
  }, [pacotesInformados, pacotesValidos, porPacote, precoPacote]);

  const semPrecoUnidade = produto.preco_venda == null;
  const semPrecoPacote = precoPacote == null || !Number.isFinite(precoPacote);
  const semPreco =
    modo === "pacote" ? semPrecoPacote : semPrecoUnidade;
  const mostrarSeletor = produto.permite_venda_pacote;

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="venda_id" value={vendaId} />
      <input type="hidden" name="produto_id" value={produto.id} />
      <input type="hidden" name="modo_venda" value={mostrarSeletor ? modo : "unidade"} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-40 flex-1 text-sm">
          {produto.nome}
          {produto.codigo ? (
            <span className="text-zinc-500"> · {produto.codigo}</span>
          ) : null}
        </span>
        <span className="font-data text-sm text-texto-secundario">
          {formatarPreco(produto.preco_venda)} / {produto.unidade}
        </span>
      </div>

      {mostrarSeletor ? (
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1 font-medium">Vender por</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="modo_venda_ui"
              checked={modo === "unidade"}
              onChange={() => setModo("unidade")}
            />
            Unidade
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="modo_venda_ui"
              checked={modo === "pacote"}
              onChange={() => setModo("pacote")}
            />
            Pacote (contém {formatarQuantidade(produto.quantidade_por_pacote)} un)
          </label>
        </fieldset>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {mostrarSeletor && modo === "pacote" ? (
          <>
            <label className="flex items-center gap-2 text-sm">
              Quantidade de pacotes
              <input
                name="quantidade_pacotes"
                type="number"
                min="1"
                step="1"
                value={quantidadePacotes}
                onChange={(evento) => setQuantidadePacotes(evento.target.value)}
                required
                disabled={semPreco || pendente}
                className="font-data min-h-11 w-24 rounded border border-borda px-2 py-1 text-sm lg:min-h-0"
              />
            </label>
            {previewPacote ? (
              <span className="font-data text-sm text-texto-secundario">
                {formatarQuantidade(previewPacote.unidades)} un ·{" "}
                {formatarPreco(previewPacote.subtotal)}
              </span>
            ) : null}
          </>
        ) : (
          <input
            name="quantidade"
            type="number"
            min="0.001"
            step="0.001"
            defaultValue="1"
            required
            disabled={semPreco || pendente}
            className="font-data min-h-11 w-24 rounded border border-borda px-2 py-1 text-sm lg:min-h-0"
          />
        )}
        <button
          type="submit"
          disabled={semPreco || pendente}
          className="min-h-11 rounded bg-gradiente-brasa px-3 py-1 text-sm font-medium text-white disabled:opacity-60 lg:min-h-0"
        >
          {pendente ? "Adicionando..." : "Adicionar"}
        </button>
      </div>
      {semPreco ? (
        <span className="text-xs text-red-700">
          {modo === "pacote" ? "Sem preço de pacote" : "Sem preço de venda"}
        </span>
      ) : null}
      {estado.error ? (
        <span className="w-full text-xs text-red-700">{estado.error}</span>
      ) : null}
    </form>
  );
}
