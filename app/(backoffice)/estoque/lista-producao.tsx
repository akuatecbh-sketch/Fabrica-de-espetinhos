import { formatarQuantidade } from "@/lib/format";
import type { ResultadoProducao } from "@/lib/estoque";
import { CardRegistro } from "../card-registro";

export type SugestaoProducao = {
  id: number;
  nome: string;
  unidade: string;
  estoque_atual: number;
  estoque_ideal: number;
  resultado: ResultadoProducao;
};

function Badge({ resultado }: { resultado: ResultadoProducao }) {
  if (resultado.tipo === "sem_ficha") {
    return (
      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-texto-secundario">
        Ficha técnica não cadastrada
      </span>
    );
  }
  if (resultado.tipo === "ok") {
    return (
      <span className="rounded bg-verde-sucesso/10 px-2 py-0.5 text-xs font-medium text-verde-sucesso">
        Pode produzir os {formatarQuantidade(resultado.sugerida)} sugeridos
      </span>
    );
  }
  return (
    <span className="rounded bg-ambar/10 px-2 py-0.5 text-xs font-medium text-ambar">
      Só é possível produzir {formatarQuantidade(resultado.produzivel)} (faltam
      insumos)
    </span>
  );
}

export function ListaProducao({ itens }: { itens: SugestaoProducao[] }) {
  if (itens.length === 0) {
    return (
      <p className="text-sm text-texto-secundario">
        Nenhum produto final abaixo do estoque ideal.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {itens.map((item) => (
        <li key={item.id}>
          <CardRegistro>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-texto-primario">{item.nome}</p>
                <p className="font-data text-sm text-texto-secundario">
                  {formatarQuantidade(item.estoque_atual)} /{" "}
                  {formatarQuantidade(item.estoque_ideal)} {item.unidade} ·
                  produzir {formatarQuantidade(item.resultado.sugerida)}
                </p>
              </div>
              <Badge resultado={item.resultado} />
            </div>
            {item.resultado.tipo === "limitada" ? (
              <ul className="mt-2 flex flex-col gap-1 text-sm text-texto-secundario">
                {item.resultado.faltas.map((falta) => (
                  <li key={falta.nome}>
                    {falta.nome}: faltam {formatarQuantidade(falta.falta)}{" "}
                    {falta.unidade}
                  </li>
                ))}
              </ul>
            ) : null}
          </CardRegistro>
        </li>
      ))}
    </ul>
  );
}
