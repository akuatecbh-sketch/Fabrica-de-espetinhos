import { formatarDataHora, formatarPreco } from "@/lib/format";
import { CardRegistro } from "../card-registro";
import { Paginacao } from "../paginacao";
import { AcoesListaPedido } from "./acoes-lista-pedido";
import { BadgeSituacaoPedido } from "./badge-situacao";

type PedidoLista = {
  id: number;
  numero: number;
  status: string;
  total: { toString(): string };
  criado_em: Date;
  clienteNome: string | null;
};

export function ListaPedidos({
  pedidos,
  vazio,
  podeCancelarPedido,
  pagina,
  totalPaginas,
  hrefPagina,
}: {
  pedidos: PedidoLista[];
  vazio: string;
  podeCancelarPedido: boolean;
  pagina: number;
  totalPaginas: number;
  hrefPagina: (pagina: number) => string;
}) {
  if (pedidos.length === 0) {
    return <p className="text-sm text-texto-secundario">{vazio}</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {pedidos.map((pedido) => (
          <li key={pedido.id}>
            <CardRegistro
              acoes={
                <AcoesListaPedido
                  pedido={pedido}
                  podeCancelarPedido={podeCancelarPedido}
                />
              }
            >
              <p className="font-data font-medium text-texto-primario">
                Pedido #{pedido.numero}
              </p>
              <p className="text-sm text-texto-primario">
                {pedido.clienteNome ?? "Sem cliente"}
              </p>
              <p className="text-sm text-texto-secundario">
                {formatarDataHora(pedido.criado_em)}
              </p>
              <p className="font-data text-lg font-semibold">
                {formatarPreco(pedido.total)}
              </p>
              <div className="mt-1">
                <BadgeSituacaoPedido
                  pedidoId={pedido.id}
                  status={pedido.status}
                />
              </div>
            </CardRegistro>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 font-medium">Número</th>
              <th className="px-3 py-2 font-medium">Cliente</th>
              <th className="px-3 py-2 font-medium">Situação</th>
              <th className="px-3 py-2 font-medium">Total</th>
              <th className="px-3 py-2 font-medium">Criado em</th>
              <th className="px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => (
              <tr
                key={pedido.id}
                className="border-b border-zinc-100 last:border-0"
              >
                <td className="px-3 py-2 font-data">{pedido.numero}</td>
                <td className="px-3 py-2">
                  {pedido.clienteNome ?? "Sem cliente"}
                </td>
                <td className="px-3 py-2">
                  <BadgeSituacaoPedido
                    pedidoId={pedido.id}
                    status={pedido.status}
                  />
                </td>
                <td className="px-3 py-2 font-data">
                  {formatarPreco(pedido.total)}
                </td>
                <td className="px-3 py-2">
                  {formatarDataHora(pedido.criado_em)}
                </td>
                <td className="px-3 py-2">
                  <AcoesListaPedido
                    pedido={pedido}
                    podeCancelarPedido={podeCancelarPedido}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Paginacao
        pagina={pagina}
        totalPaginas={totalPaginas}
        hrefPara={hrefPagina}
      />
    </>
  );
}
