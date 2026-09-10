import { formatarData } from "@/lib/format";
import { TaxasForm } from "./taxas-form";

type Taxa = {
  id: number;
  numero_parcelas: number;
  percentual: { toString(): string };
  vigencia_inicio: Date;
  vigencia_fim: Date | null;
  forma_pagamento: { nome: string };
};

function formatarPercentual(valor: { toString(): string }) {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(valor.toString()))}%`;
}

function TabelaTaxas({
  taxas,
  historico,
}: {
  taxas: Taxa[];
  historico: boolean;
}) {
  if (taxas.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-texto-secundario">
        {historico
          ? "Nenhuma taxa encerrada ainda."
          : "Nenhuma taxa vigente cadastrada."}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-3 py-2 font-medium">Forma</th>
            <th className="px-3 py-2 font-medium">Parcelas</th>
            <th className="px-3 py-2 font-medium">Percentual</th>
            <th className="px-3 py-2 font-medium">
              {historico ? "Vigência" : "Vigente desde"}
            </th>
          </tr>
        </thead>
        <tbody>
          {taxas.map((taxa) => (
            <tr key={taxa.id} className="border-b border-zinc-100 last:border-0">
              <td className="px-3 py-2">{taxa.forma_pagamento.nome}</td>
              <td className="px-3 py-2 font-data">{taxa.numero_parcelas}x</td>
              <td className="px-3 py-2 font-data">
                {formatarPercentual(taxa.percentual)}
              </td>
              <td className="px-3 py-2">
                {historico && taxa.vigencia_fim
                  ? `${formatarData(taxa.vigencia_inicio)} a ${formatarData(taxa.vigencia_fim)}`
                  : formatarData(taxa.vigencia_inicio)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TaxasPainel({
  vigentes,
  historico,
  formas,
  nova,
}: {
  vigentes: Taxa[];
  historico: Taxa[];
  formas: { id: number; nome: string; tipo: string }[];
  nova: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      {nova ? <TaxasForm formas={formas} /> : null}

      <section className="rounded border border-zinc-200 bg-white">
        <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-medium text-texto-primario">
          Taxas vigentes
        </h2>
        <TabelaTaxas taxas={vigentes} historico={false} />
      </section>

      <section className="rounded border border-zinc-200 bg-white">
        <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-medium text-texto-primario">
          Histórico
        </h2>
        <TabelaTaxas taxas={historico} historico />
      </section>
    </div>
  );
}
