import { formatarPreco } from "@/lib/format";
import type { FaturamentoMes } from "@/lib/faturamento";
import { FaturamentoGrafico } from "./faturamento-grafico";
import {
  FaturamentoBotoesExportacao,
  FaturamentoFolhaImpressao,
} from "./faturamento-exportacao";
import { SeletorMes } from "./seletor-mes";

function CelulaNumero({
  valor,
  inteiro = false,
}: {
  valor: number;
  inteiro?: boolean;
}) {
  return (
    <td className="px-3 py-2 text-right font-data">
      {inteiro ? valor : formatarPreco(valor)}
    </td>
  );
}

export function FaturamentoPainel({ dados }: { dados: FaturamentoMes }) {
  return (
    <div className="flex flex-col gap-6">
      <style>{`@media print { @page { size: A4; margin: 12mm; } }`}</style>
      <div className="print-ocultar flex flex-wrap items-end justify-between gap-3">
        <SeletorMes key={dados.mes} mes={dados.mes} aba="faturamento" />
        <FaturamentoBotoesExportacao dados={dados} />
      </div>

      <section className="print-ocultar overflow-x-auto rounded border border-zinc-200 bg-white">
        <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-medium text-texto-primario">
          Por forma de pagamento — {dados.rotuloMes}
        </h2>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 font-medium">Forma</th>
              <th className="px-3 py-2 text-right font-medium">Transações</th>
              <th className="px-3 py-2 text-right font-medium">Valor bruto</th>
              <th className="px-3 py-2 text-right font-medium">Taxa</th>
              <th className="px-3 py-2 text-right font-medium">Valor líquido</th>
            </tr>
          </thead>
          <tbody>
            {dados.linhas.map((linha) => (
              <tr key={linha.forma} className="border-b border-zinc-100">
                <td className="px-3 py-2">{linha.forma}</td>
                <CelulaNumero valor={linha.qtd} inteiro />
                <CelulaNumero valor={linha.bruto} />
                <CelulaNumero valor={linha.taxa} />
                <CelulaNumero valor={linha.liquido} />
              </tr>
            ))}
            <tr className="bg-zinc-50 font-medium">
              <td className="px-3 py-2">{dados.total.forma}</td>
              <CelulaNumero valor={dados.total.qtd} inteiro />
              <CelulaNumero valor={dados.total.bruto} />
              <CelulaNumero valor={dados.total.taxa} />
              <CelulaNumero valor={dados.total.liquido} />
            </tr>
          </tbody>
        </table>
      </section>

      <section className="print-ocultar rounded border border-zinc-200 bg-white px-4 py-4">
        <h2 className="text-sm font-medium text-texto-primario">
          Faturamento líquido por dia
        </h2>
        <div className="mt-4">
          <FaturamentoGrafico pontos={dados.diario} />
        </div>
      </section>

      <FaturamentoFolhaImpressao dados={dados} />
    </div>
  );
}
