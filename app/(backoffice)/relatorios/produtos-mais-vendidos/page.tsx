import Link from "next/link";
import { exigirAcesso } from "@/lib/permissoes";
import { formatarPreco, formatarQuantidade } from "@/lib/format";
import { formatarPesoKg } from "@/lib/venda-item";
import {
  LIMITE_PRODUTOS_MAIS_VENDIDOS,
  obterProdutosMaisVendidos,
  periodoDaUrl,
} from "@/lib/relatorios";
import { CardRegistro } from "../../card-registro";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<{ de?: string; ate?: string; todos?: string }>;
};

export default async function ProdutosMaisVendidosPage({ searchParams }: Props) {
  await exigirAcesso("relatorios");
  const params = await searchParams;
  const periodo = periodoDaUrl(params.de, params.ate);
  const todos = params.todos === "1";
  const { itens, temMais } = await obterProdutosMaisVendidos({
    de: periodo.de,
    ate: periodo.ate,
    todos,
  });

  const queryPeriodo = `de=${periodo.de}&ate=${periodo.ate}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/relatorios" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para relatórios
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Produtos mais vendidos
        </h1>
        <p className="mt-1 text-sm text-texto-secundario">
          Vendas finalizadas no período, agrupadas por produto.
        </p>
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      >
        {todos ? <input type="hidden" name="todos" value="1" /> : null}
        <label className="flex flex-col gap-1 text-sm">
          De
          <input
            type="date"
            name="de"
            defaultValue={periodo.de}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          até
          <input
            type="date"
            name="ate"
            defaultValue={periodo.ate}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Filtrar
        </button>
      </form>

      {itens.length === 0 ? (
        <p className="text-sm text-texto-secundario">
          Nenhuma venda finalizada neste período.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-3 md:hidden">
            {itens.map((item) => (
              <li key={item.produtoId}>
                <CardRegistro>
                  <p className="font-medium text-texto-primario">{item.nome}</p>
                  <p className="font-data text-sm text-texto-primario">
                    {item.vendidoPorPeso
                      ? `${formatarPesoKg(item.quantidade)} kg`
                      : formatarQuantidade(item.quantidade)}
                  </p>
                  <p className="font-data text-sm text-texto-secundario">
                    {formatarPreco(item.valorTotal)}
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
                  <th className="px-3 py-2 font-medium">Quantidade</th>
                  <th className="px-3 py-2 font-medium">Valor total</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr
                    key={item.produtoId}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-3 py-2">{item.nome}</td>
                    <td className="px-3 py-2 font-data">
                      {item.vendidoPorPeso
                        ? `${formatarPesoKg(item.quantidade)} kg`
                        : formatarQuantidade(item.quantidade)}
                    </td>
                    <td className="px-3 py-2 font-data">
                      {formatarPreco(item.valorTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!todos && temMais ? (
            <Link
              href={`/relatorios/produtos-mais-vendidos?${queryPeriodo}&todos=1`}
              className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
            >
              Ver todos
            </Link>
          ) : null}
          {todos ? (
            <p className="text-xs text-texto-secundario">
              Lista completa do período. O recorte padrão mostra os{" "}
              {LIMITE_PRODUTOS_MAIS_VENDIDOS} primeiros.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
