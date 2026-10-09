import { formatarDataHora, formatarPreco } from "@/lib/format";
import type { PedidoImpressaoDados } from "@/lib/pedido-impressao";
import { BlocoAssinaturaPedido } from "./bloco-assinatura";

export function PedidoLayoutA4({
  pedido,
  nomeEmpresa,
  logoSrc,
  cnpjEmpresa,
  enderecoEmpresa,
  telefoneEmpresa,
}: {
  pedido: PedidoImpressaoDados;
  nomeEmpresa: string | null;
  logoSrc: string | null;
  cnpjEmpresa: string | null;
  enderecoEmpresa: string | null;
  telefoneEmpresa: string | null;
}) {
  return (
    <article className="pedido-a4 mx-auto w-full max-w-[190mm] bg-white px-2 py-4 text-black">
      <header className="mb-6 break-inside-avoid text-center">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt=""
            className="mx-auto mb-2 h-16 w-auto max-h-16 object-contain"
          />
        ) : null}
        {nomeEmpresa ? (
          <p className="text-xl font-semibold uppercase">{nomeEmpresa}</p>
        ) : (
          <p className="text-xl font-semibold">Pedido</p>
        )}
        {cnpjEmpresa ? (
          <p className="mt-1 font-data text-sm">CNPJ {cnpjEmpresa}</p>
        ) : null}
        {enderecoEmpresa ? (
          <p className="mt-1 text-sm">{enderecoEmpresa}</p>
        ) : null}
        {telefoneEmpresa ? (
          <p className="mt-1 font-data text-sm">{telefoneEmpresa}</p>
        ) : null}
        <p className="mt-3 text-base font-medium">Pedido #{pedido.numero}</p>
        <p className="font-data text-sm">{formatarDataHora(pedido.data)}</p>
      </header>

      <section className="mb-6 grid break-inside-avoid gap-3 border border-zinc-300 p-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Cliente
          </p>
          <p className="mt-1 font-medium">{pedido.clienteNome}</p>
          {pedido.clienteDocumento ? (
            <p className="mt-1 font-data text-sm">
              {pedido.clienteDocumento.rotulo} {pedido.clienteDocumento.valor}
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Contato
          </p>
          <p className="mt-1 text-sm">Telefone: {pedido.clienteTelefone}</p>
          <p className="mt-1 text-sm">Endereço: {pedido.clienteEndereco}</p>
        </div>
      </section>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-400 text-left">
            <th className="py-2 pr-2 font-medium">Item</th>
            <th className="py-2 pr-2 text-right font-medium">Qtd</th>
            <th className="py-2 pr-2 text-right font-medium">Unit.</th>
            <th className="py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {pedido.itens.map((item) => (
            <tr key={item.id} className="break-inside-avoid border-b border-zinc-200">
              <td className="py-2 pr-2">
                <p className="font-medium">{item.nome}</p>
                {item.observacao ? (
                  <p className="text-xs text-zinc-600">{item.observacao}</p>
                ) : null}
              </td>
              <td className="py-2 pr-2 text-right font-data">{item.quantidade}</td>
              <td className="py-2 pr-2 text-right font-data">
                {item.precoUnitario}
              </td>
              <td className="py-2 text-right font-data">{item.subtotal}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 break-inside-avoid text-right">
        <p className="text-sm">
          Subtotal:{" "}
          <span className="font-data">{formatarPreco(pedido.subtotal)}</span>
        </p>
        {Number(pedido.desconto) > 0 ? (
          <p className="text-sm">
            Desconto:{" "}
            <span className="font-data">{formatarPreco(pedido.desconto)}</span>
          </p>
        ) : null}
        <p className="mt-1 text-lg font-semibold">
          Total: <span className="font-data">{formatarPreco(pedido.total)}</span>
        </p>
      </div>

      <section className="mt-6 break-inside-avoid">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Observação
        </p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm">
          {pedido.observacao?.trim() || "não informado"}
        </p>
      </section>

      <BlocoAssinaturaPedido
        entregueEm={pedido.entregueEm}
        recebidoPorNome={pedido.recebidoPorNome}
      />
    </article>
  );
}
