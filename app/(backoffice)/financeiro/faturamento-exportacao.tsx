"use client";

import type { FaturamentoMes } from "@/lib/faturamento";
import { formatarPreco } from "@/lib/format";
import {
  BotoesExportacao,
  FolhaRelatorio,
  baixarCsv,
  slugArquivo,
} from "../exportacao-relatorio";

const COLUNAS = [
  "Forma",
  "Transações",
  "Valor bruto",
  "Taxa",
  "Valor líquido",
];

function linhasFaturamento(dados: FaturamentoMes) {
  return [...dados.linhas, dados.total].map((linha) => [
    linha.forma,
    String(linha.qtd),
    formatarPreco(linha.bruto),
    formatarPreco(linha.taxa),
    formatarPreco(linha.liquido),
  ]);
}

export function FaturamentoBotoesExportacao({
  dados,
}: {
  dados: FaturamentoMes;
}) {
  return (
    <BotoesExportacao
      onExportarCsv={() =>
        baixarCsv(`faturamento-${slugArquivo(dados.rotuloMes)}.csv`, [
          COLUNAS,
          ...linhasFaturamento(dados),
        ])
      }
    />
  );
}

export function FaturamentoFolhaImpressao({
  dados,
}: {
  dados: FaturamentoMes;
}) {
  return (
    <FolhaRelatorio
      titulo={`Faturamento — ${dados.rotuloMes}`}
      subtitulo="Por forma de pagamento"
      colunas={COLUNAS}
      linhas={linhasFaturamento(dados)}
    />
  );
}
