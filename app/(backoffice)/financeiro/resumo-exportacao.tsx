"use client";

import { formatarPreco } from "@/lib/format";
import type { ResumoDreMes } from "@/lib/resumo-financeiro";
import {
  BotoesExportacao,
  FolhaRelatorio,
  baixarCsv,
  slugArquivo,
} from "../exportacao-relatorio";

function linhasResumo(dados: ResumoDreMes) {
  return [
    ["Receita bruta", formatarPreco(dados.receitaBruta)],
    ["Taxas de cartão", formatarPreco(dados.taxasCartao)],
    ["Receita líquida", formatarPreco(dados.receitaLiquida)],
    ["Despesas fixas", formatarPreco(dados.despesasFixas)],
    ["Despesas variáveis", formatarPreco(dados.despesasVariaveis)],
    ["Resultado do mês", formatarPreco(dados.resultado)],
  ];
}

export function ResumoBotoesExportacao({ dados }: { dados: ResumoDreMes }) {
  const linhas = linhasResumo(dados);
  return (
    <BotoesExportacao
      onExportarCsv={() =>
        baixarCsv(`resumo-financeiro-${slugArquivo(dados.rotuloMes)}.csv`, [
          ["Linha", "Valor"],
          ...linhas,
        ])
      }
    />
  );
}

export function ResumoFolhaImpressao({ dados }: { dados: ResumoDreMes }) {
  return (
    <FolhaRelatorio
      titulo={`Resumo financeiro — ${dados.rotuloMes}`}
      subtitulo="Mini-DRE do mês selecionado"
      colunas={["Linha", "Valor"]}
      linhas={linhasResumo(dados)}
    />
  );
}
