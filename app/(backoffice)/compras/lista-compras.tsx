import Link from "next/link";
import { formatarData, formatarPreco } from "@/lib/format";
import { classesStatusNota, rotuloStatusNota } from "@/lib/compras";
import { CardRegistro } from "../card-registro";
import { CancelarNotaButton } from "./cancelar-button";
import { ExcluirNotaButton } from "./excluir-button";

type NotaLista = {
  id: number;
  numero: string;
  serie: string | null;
  data_emissao: Date;
  valor_total: { toString(): string };
  status: string;
  fornecedor: { razao_social: string; nome_fantasia: string | null };
  lancadoPor: string;
};

function nomeFornecedor(nota: NotaLista) {
  return nota.fornecedor.nome_fantasia || nota.fornecedor.razao_social;
}

function numeroSerie(nota: NotaLista) {
  return nota.serie ? `${nota.numero}/${nota.serie}` : nota.numero;
}

function AcoesNota({ nota }: { nota: NotaLista }) {
  return (
    <>
      <Link
        href={`/compras/${nota.id}`}
        className="inline-flex min-h-11 items-center text-texto-primario underline-offset-2 hover:underline md:min-h-0"
      >
        {nota.status === "lancada" ? "Continuar" : "Ver"}
      </Link>
      {nota.status === "lancada" ? <ExcluirNotaButton id={nota.id} /> : null}
      {nota.status === "conferida" ? <CancelarNotaButton id={nota.id} /> : null}
    </>
  );
}

export function ListaCompras({
  notas,
  vazio,
}: {
  notas: NotaLista[];
  vazio: string;
}) {
  if (notas.length === 0) {
    return <p className="text-sm text-texto-secundario">{vazio}</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {notas.map((nota) => (
          <li key={nota.id}>
            <CardRegistro acoes={<AcoesNota nota={nota} />}>
              <p className="font-medium text-texto-primario">
                {nomeFornecedor(nota)}
              </p>
              <p className="font-data text-sm text-texto-primario">
                NF-e {numeroSerie(nota)}
              </p>
              <p className="text-sm text-texto-secundario">
                {formatarData(nota.data_emissao)} · {nota.lancadoPor}
              </p>
              <p className="font-data text-lg font-semibold">
                {formatarPreco(nota.valor_total)}
              </p>
              <span className={`mt-1 w-fit ${classesStatusNota(nota.status)}`}>
                {rotuloStatusNota(nota.status)}
              </span>
            </CardRegistro>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 font-medium">Fornecedor</th>
              <th className="px-3 py-2 font-medium">Número/série</th>
              <th className="px-3 py-2 font-medium">Emissão</th>
              <th className="px-3 py-2 font-medium">Lançada por</th>
              <th className="px-3 py-2 font-medium">Valor total</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {notas.map((nota) => (
              <tr
                key={nota.id}
                className="border-b border-zinc-100 last:border-0"
              >
                <td className="px-3 py-2">{nomeFornecedor(nota)}</td>
                <td className="px-3 py-2 font-data">{numeroSerie(nota)}</td>
                <td className="px-3 py-2">{formatarData(nota.data_emissao)}</td>
                <td className="px-3 py-2">{nota.lancadoPor}</td>
                <td className="px-3 py-2 font-data">
                  {formatarPreco(nota.valor_total)}
                </td>
                <td className="px-3 py-2">
                  <span className={classesStatusNota(nota.status)}>
                    {rotuloStatusNota(nota.status)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-3">
                    <AcoesNota nota={nota} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
