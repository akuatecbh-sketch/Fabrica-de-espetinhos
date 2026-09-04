import Link from "next/link";
import { CardRegistro } from "../../card-registro";
import { AlternarAtivoButton } from "./alternar-ativo-button";

type FaqLista = {
  id: number;
  titulo: string;
  rota_destino: string;
  modulo_nome: string;
  ordem: number;
  ativo: boolean;
};

function AcoesFaq({ item }: { item: FaqLista }) {
  return (
    <>
      <Link
        href={`/ajuda/gerenciar/${item.id}/editar`}
        className="inline-flex min-h-11 items-center text-texto-primario underline-offset-2 hover:underline md:min-h-0"
      >
        Editar
      </Link>
      <AlternarAtivoButton
        id={item.id}
        titulo={item.titulo}
        ativo={item.ativo}
      />
    </>
  );
}

export function ListaFaq({
  itens,
  vazio,
}: {
  itens: FaqLista[];
  vazio: string;
}) {
  if (itens.length === 0) {
    return <p className="text-sm text-texto-secundario">{vazio}</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {itens.map((item) => (
          <li key={item.id}>
            <CardRegistro acoes={<AcoesFaq item={item} />}>
              <p className="font-medium text-texto-primario">{item.titulo}</p>
              <p className="font-data text-sm text-texto-secundario">
                {item.rota_destino}
              </p>
              <p className="text-sm text-texto-secundario">{item.modulo_nome}</p>
              <p className="text-xs text-texto-secundario">
                Ordem {item.ordem} · {item.ativo ? "Ativo" : "Inativo"}
              </p>
            </CardRegistro>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 font-medium">Título</th>
              <th className="px-3 py-2 font-medium">Rota</th>
              <th className="px-3 py-2 font-medium">Módulo</th>
              <th className="px-3 py-2 font-medium">Ordem</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr
                key={item.id}
                className="border-b border-zinc-100 last:border-0"
              >
                <td className="px-3 py-2">{item.titulo}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {item.rota_destino}
                </td>
                <td className="px-3 py-2">{item.modulo_nome}</td>
                <td className="px-3 py-2">{item.ordem}</td>
                <td className="px-3 py-2">
                  {item.ativo ? "Ativo" : "Inativo"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-start gap-3">
                    <AcoesFaq item={item} />
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
