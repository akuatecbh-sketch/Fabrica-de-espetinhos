import { formatarPreco, formatarQuantidade } from "@/lib/format";
import { linhaItemVenda, rotuloQuantidadeItem } from "@/lib/venda-item";
import { CardRegistro } from "../card-registro";
import { QuantidadeItemPedidoForm } from "./quantidade-item-form";
import { RemoverItemPedidoButton } from "./remover-item-button";

export type ItemPedidoExibicao = {
  id: number;
  quantidade: { toString(): string };
  preco_unitario: { toString(): string };
  subtotal: { toString(): string };
  vendido_em_pacote: boolean;
  quantidade_pacotes: number | null;
  produtoNome: string;
};

export function ItensPedido({
  itens,
  editavel,
  total,
}: {
  itens: ItemPedidoExibicao[];
  editavel: boolean;
  total: { toString(): string };
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Itens do pedido</h2>
      {itens.length === 0 ? (
        <p className="text-sm text-texto-secundario">
          Nenhum item adicionado ainda.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-3 md:hidden">
            {itens.map((item) => (
              <li key={item.id}>
                <CardRegistro
                  acoes={
                    editavel ? (
                      <div className="flex flex-col gap-2">
                        <QuantidadeItemPedidoForm
                          itemId={item.id}
                          vendidoEmPacote={item.vendido_em_pacote}
                          quantidade={item.quantidade.toString()}
                          quantidadePacotes={item.quantidade_pacotes}
                        />
                        <RemoverItemPedidoButton
                          id={item.id}
                          nome={item.produtoNome}
                        />
                      </div>
                    ) : undefined
                  }
                >
                  <p className="font-medium text-texto-primario">
                    {item.vendido_em_pacote
                      ? linhaItemVenda(item.produtoNome, item)
                      : item.produtoNome}
                  </p>
                  {item.vendido_em_pacote ? null : (
                    <>
                      <p className="font-data text-sm text-texto-primario">
                        {formatarQuantidade(item.quantidade)} ×{" "}
                        {formatarPreco(item.preco_unitario)}
                      </p>
                      <p className="font-data text-sm text-texto-secundario">
                        Subtotal {formatarPreco(item.subtotal)}
                      </p>
                    </>
                  )}
                </CardRegistro>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Produto</th>
                  <th className="px-3 py-2 font-medium">Qtd</th>
                  <th className="px-3 py-2 font-medium">Preço unitário</th>
                  <th className="px-3 py-2 font-medium">Subtotal</th>
                  {editavel ? (
                    <th className="px-3 py-2 font-medium">Ações</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-3 py-2">
                      {item.vendido_em_pacote
                        ? linhaItemVenda(item.produtoNome, item)
                        : item.produtoNome}
                    </td>
                    <td className="px-3 py-2 font-data">
                      {editavel ? (
                        <QuantidadeItemPedidoForm
                          itemId={item.id}
                          vendidoEmPacote={item.vendido_em_pacote}
                          quantidade={item.quantidade.toString()}
                          quantidadePacotes={item.quantidade_pacotes}
                        />
                      ) : (
                        rotuloQuantidadeItem(item)
                      )}
                    </td>
                    <td className="px-3 py-2 font-data">
                      {item.vendido_em_pacote
                        ? "—"
                        : formatarPreco(item.preco_unitario)}
                    </td>
                    <td className="px-3 py-2 font-data">
                      {formatarPreco(item.subtotal)}
                    </td>
                    {editavel ? (
                      <td className="px-3 py-2">
                        <RemoverItemPedidoButton
                          id={item.id}
                          nome={item.produtoNome}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="text-lg font-semibold">
        Total: <span className="font-data">{formatarPreco(total)}</span>
      </p>
    </section>
  );
}
