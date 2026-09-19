import Link from "next/link";
import { formatarQuantidade, rotuloTipo } from "@/lib/format";
import { CardRegistro } from "../card-registro";
import { VisaoGeralInterativa } from "./visao-geral-interativa";
import type { ProdutoEstoqueVisao } from "./lista-todos-produtos";

type Critico = {
  id: number;
  nome: string;
  tipo: string;
  estoque_atual: number;
  estoque_minimo: number;
  unidade: string;
};

export function VisaoGeralEstoque({
  criticos,
  produtos,
}: {
  criticos: Critico[];
  produtos: ProdutoEstoqueVisao[];
}) {
  return (
    <VisaoGeralInterativa produtos={produtos}>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Itens mais críticos</h2>
        {criticos.length === 0 ? (
          <p className="text-sm text-texto-secundario">
            Nenhum produto abaixo do estoque mínimo.
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-3 md:hidden">
              {criticos.map((item) => (
                <li key={item.id}>
                  <CardRegistro
                    acoes={
                      <Link
                        href={`/produtos/${item.id}/editar`}
                        className="inline-flex min-h-11 items-center text-texto-primario underline-offset-2 hover:underline"
                      >
                        Ver produto
                      </Link>
                    }
                  >
                    <p className="font-medium text-texto-primario">{item.nome}</p>
                    <p className="text-xs text-texto-secundario">
                      {rotuloTipo(item.tipo)}
                    </p>
                    <p className="font-data text-sm">
                      {formatarQuantidade(item.estoque_atual)} /{" "}
                      {formatarQuantidade(item.estoque_minimo)} {item.unidade}
                    </p>
                  </CardRegistro>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Produto</th>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium">Atual / mínimo</th>
                    <th className="px-3 py-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {criticos.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="px-3 py-2">{item.nome}</td>
                      <td className="px-3 py-2">{rotuloTipo(item.tipo)}</td>
                      <td className="px-3 py-2 font-data">
                        {formatarQuantidade(item.estoque_atual)} /{" "}
                        {formatarQuantidade(item.estoque_minimo)} {item.unidade}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/produtos/${item.id}/editar`}
                          className="text-texto-primario underline-offset-2 hover:underline"
                        >
                          Ver produto
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </VisaoGeralInterativa>
  );
}
