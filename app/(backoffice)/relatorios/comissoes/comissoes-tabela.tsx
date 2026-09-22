"use client";

import { formatarPreco } from "@/lib/format";
import {
  formatarPercentualComissao,
  rotuloPeriodo,
  type RelatorioComissoes,
} from "@/lib/comissoes";
import { CardRegistro } from "../../card-registro";
import {
  BotoesExportacao,
  FolhaRelatorio,
  baixarCsv,
  slugArquivo,
} from "../../exportacao-relatorio";

const COLUNAS = [
  "Funcionário",
  "Vendas",
  "Faturamento líquido",
  "Comissão (%)",
  "Comissão (R$)",
];

function linhasCsv(dados: RelatorioComissoes) {
  const corpo = dados.linhas.map((linha) => [
    linha.nome,
    String(linha.quantidadeVendas),
    formatarPreco(linha.faturamentoLiquido),
    formatarPercentualComissao(linha.percentual),
    formatarPreco(linha.valorComissao),
  ]);
  if (corpo.length === 0) return corpo;
  corpo.push([
    "Total",
    String(dados.totalVendas),
    formatarPreco(dados.totalLiquido),
    "",
    formatarPreco(dados.totalComissao),
  ]);
  return corpo;
}

export function ComissoesTabela({ dados }: { dados: RelatorioComissoes }) {
  const exportaveis = linhasCsv(dados);
  const periodo = rotuloPeriodo(dados.de, dados.ate);

  return (
    <div className="flex flex-col gap-4">
      <div className="print-ocultar flex justify-end">
        <BotoesExportacao
          onExportarCsv={() =>
            baixarCsv(`comissoes-${slugArquivo(periodo)}.csv`, [
              COLUNAS,
              ...exportaveis,
            ])
          }
        />
      </div>

      {dados.linhas.length === 0 ? (
        <p className="print-ocultar text-sm text-texto-secundario">
          Nenhum funcionário com percentual de comissão e usuário vinculado.
        </p>
      ) : (
        <>
          <ul className="print-ocultar flex flex-col gap-3 md:hidden">
            {dados.linhas.map((linha) => (
              <li key={linha.funcionarioId}>
                <CardRegistro>
                  <p className="font-medium text-texto-primario">{linha.nome}</p>
                  <p className="text-sm text-texto-secundario">
                    {linha.quantidadeVendas === 1
                      ? "1 venda"
                      : `${linha.quantidadeVendas} vendas`}{" "}
                    · {formatarPercentualComissao(linha.percentual)}
                  </p>
                  <p className="font-data text-sm">
                    Líquido {formatarPreco(linha.faturamentoLiquido)}
                  </p>
                  <p className="font-data text-sm font-medium">
                    Comissão {formatarPreco(linha.valorComissao)}
                  </p>
                </CardRegistro>
              </li>
            ))}
            <li>
              <CardRegistro>
                <p className="font-medium text-texto-primario">Total</p>
                <p className="font-data text-sm font-medium">
                  {formatarPreco(dados.totalComissao)}
                </p>
              </CardRegistro>
            </li>
          </ul>

          <div className="print-ocultar hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Funcionário</th>
                  <th className="px-3 py-2 font-medium">Vendas</th>
                  <th className="px-3 py-2 font-medium">Faturamento líquido</th>
                  <th className="px-3 py-2 font-medium">Comissão (%)</th>
                  <th className="px-3 py-2 font-medium">Comissão (R$)</th>
                </tr>
              </thead>
              <tbody>
                {dados.linhas.map((linha) => (
                  <tr
                    key={linha.funcionarioId}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-3 py-2">{linha.nome}</td>
                    <td className="px-3 py-2 font-data">
                      {linha.quantidadeVendas}
                    </td>
                    <td className="px-3 py-2 font-data">
                      {formatarPreco(linha.faturamentoLiquido)}
                    </td>
                    <td className="px-3 py-2 font-data">
                      {formatarPercentualComissao(linha.percentual)}
                    </td>
                    <td className="px-3 py-2 font-data">
                      {formatarPreco(linha.valorComissao)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-200 bg-zinc-50 font-medium">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 font-data">{dados.totalVendas}</td>
                  <td className="px-3 py-2 font-data">
                    {formatarPreco(dados.totalLiquido)}
                  </td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 font-data">
                    {formatarPreco(dados.totalComissao)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      <FolhaRelatorio
        titulo="Comissões de vendedor"
        subtitulo={periodo}
        colunas={COLUNAS}
        linhas={exportaveis}
      />
    </div>
  );
}
