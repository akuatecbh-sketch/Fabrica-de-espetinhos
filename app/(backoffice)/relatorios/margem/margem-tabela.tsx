"use client";

import { useMemo, useState } from "react";
import { formatarPreco, rotuloTipo } from "@/lib/format";
import {
  LIMIAR_MARGEM_PADRAO,
  formatarPercentualMargem,
  type LinhaMargemProduto,
  type TipoFiltroMargem,
} from "@/lib/margem";
import { CardRegistro } from "../../card-registro";
import {
  BotoesExportacao,
  FolhaRelatorio,
  baixarCsv,
} from "../../exportacao-relatorio";

function limiarDoCampo(valor: string) {
  const numero = Number(valor.trim().replace(",", "."));
  if (!Number.isFinite(numero) || numero < 0) return LIMIAR_MARGEM_PADRAO;
  return numero;
}

export function MargemTabela({ linhas }: { linhas: LinhaMargemProduto[] }) {
  const [tipo, setTipo] = useState<TipoFiltroMargem>("todos");
  const [limiarTexto, setLimiarTexto] = useState(String(LIMIAR_MARGEM_PADRAO));
  const limiar = limiarDoCampo(limiarTexto);

  const filtradas = useMemo(() => {
    if (tipo === "todos") return linhas;
    return linhas.filter((linha) => linha.tipo === tipo);
  }, [linhas, tipo]);

  const colunasCsv = [
    "Produto",
    "Tipo",
    "Custo médio",
    "Preço de venda",
    "Margem (R$)",
    "Margem (%)",
  ];
  const linhasCsv = filtradas.map((linha) => [
    linha.nome,
    rotuloTipo(linha.tipo),
    linha.precoCusto == null ? "Custo desconhecido" : formatarPreco(linha.precoCusto),
    linha.precoVenda == null ? "—" : formatarPreco(linha.precoVenda),
    linha.precoCusto == null || linha.margemReais == null
      ? "—"
      : formatarPreco(linha.margemReais),
    linha.precoCusto == null || linha.margemPct == null
      ? "—"
      : formatarPercentualMargem(linha.margemPct),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="print-ocultar flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <label className="flex flex-col gap-1 text-sm">
          Tipo
          <select
            value={tipo}
            onChange={(evento) =>
              setTipo(evento.target.value as TipoFiltroMargem)
            }
            className="rounded border border-zinc-300 bg-white px-3 py-2"
          >
            <option value="todos">Produto final e revenda</option>
            <option value="produto_final">Produto final</option>
            <option value="revenda">Revenda</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Destacar margem abaixo de (%)
          <input
            type="text"
            inputMode="decimal"
            value={limiarTexto}
            onChange={(evento) => setLimiarTexto(evento.target.value)}
            className="font-data w-28 rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <BotoesExportacao
          onExportarCsv={() =>
            baixarCsv("margem-por-produto.csv", [colunasCsv, ...linhasCsv])
          }
        />
      </div>

      {filtradas.length === 0 ? (
        <p className="print-ocultar text-sm text-texto-secundario">
          Nenhum produto final ou de revenda cadastrado.
        </p>
      ) : (
        <>
          <ul className="print-ocultar flex flex-col gap-3 md:hidden">
            {filtradas.map((linha) => {
              const apertada =
                linha.margemPct != null && linha.margemPct < limiar;
              return (
                <li key={linha.id}>
                  <CardRegistro>
                    <p className="font-medium text-texto-primario">
                      {linha.nome}
                    </p>
                    <p className="text-xs text-texto-secundario">
                      {rotuloTipo(linha.tipo)}
                    </p>
                    <p className="font-data text-sm">
                      Custo{" "}
                      {linha.precoCusto == null
                        ? "desconhecido"
                        : formatarPreco(linha.precoCusto)}{" "}
                      · Venda{" "}
                      {linha.precoVenda == null
                        ? "—"
                        : formatarPreco(linha.precoVenda)}
                    </p>
                    {linha.precoCusto == null ? (
                      <p className="text-sm text-texto-secundario">
                        Custo desconhecido
                      </p>
                    ) : linha.margemPct == null || linha.margemReais == null ? (
                      <p className="text-sm text-texto-secundario">
                        Sem preço de venda
                      </p>
                    ) : (
                      <p className="font-data text-sm">
                        {formatarPreco(linha.margemReais)} ·{" "}
                        <span
                          className={
                            apertada
                              ? "inline-flex items-center rounded bg-coral-bg px-2 py-0.5 text-xs font-medium text-coral-texto"
                              : undefined
                          }
                        >
                          {formatarPercentualMargem(linha.margemPct)}
                        </span>
                      </p>
                    )}
                  </CardRegistro>
                </li>
              );
            })}
          </ul>

          <div className="print-ocultar hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Produto</th>
                  <th className="px-3 py-2 font-medium">Custo médio</th>
                  <th className="px-3 py-2 font-medium">Preço de venda</th>
                  <th className="px-3 py-2 font-medium">Margem (R$)</th>
                  <th className="px-3 py-2 font-medium">Margem (%)</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((linha) => {
                  const apertada =
                    linha.margemPct != null && linha.margemPct < limiar;
                  const semCusto = linha.precoCusto == null;
                  return (
                    <tr
                      key={linha.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="px-3 py-2">
                        <p>{linha.nome}</p>
                        <p className="text-xs text-texto-secundario">
                          {rotuloTipo(linha.tipo)}
                        </p>
                      </td>
                      <td className="px-3 py-2 font-data">
                        {semCusto ? (
                          <span className="text-texto-secundario">
                            Custo desconhecido
                          </span>
                        ) : (
                          formatarPreco(linha.precoCusto)
                        )}
                      </td>
                      <td className="px-3 py-2 font-data">
                        {linha.precoVenda == null
                          ? "—"
                          : formatarPreco(linha.precoVenda)}
                      </td>
                      <td className="px-3 py-2 font-data">
                        {semCusto || linha.margemReais == null
                          ? "—"
                          : formatarPreco(linha.margemReais)}
                      </td>
                      <td className="px-3 py-2 font-data">
                        {semCusto || linha.margemPct == null ? (
                          "—"
                        ) : apertada ? (
                          <span className="inline-flex items-center rounded bg-coral-bg px-2 py-0.5 text-xs font-medium text-coral-texto">
                            {formatarPercentualMargem(linha.margemPct)}
                          </span>
                        ) : (
                          formatarPercentualMargem(linha.margemPct)
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <FolhaRelatorio
        titulo="Margem por produto"
        subtitulo="Custo médio, preço de venda e margem"
        colunas={colunasCsv}
        linhas={linhasCsv}
      />
    </div>
  );
}
