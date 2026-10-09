import { formatarDataHora, formatarPreco } from "@/lib/format";
import type { PedidoImpressaoDados } from "@/lib/pedido-impressao";
import { BlocoAssinaturaPedido } from "./bloco-assinatura";

export function PedidoLayoutCupom({
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
    <article className="cupom-nao-fiscal mx-auto w-[80mm] max-w-full border border-zinc-300 bg-white px-3 py-4 text-[12px] leading-tight text-black">
      <header className="mb-3 text-center">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt=""
            className="mx-auto mb-2 h-14 w-auto max-w-[48mm] object-contain"
          />
        ) : null}
        {nomeEmpresa ? (
          <p className="text-[14px] font-semibold uppercase">{nomeEmpresa}</p>
        ) : (
          <p className="text-[14px] font-semibold">Pedido</p>
        )}
        {cnpjEmpresa ? (
          <p className="mt-1 font-data">CNPJ {cnpjEmpresa}</p>
        ) : null}
        {enderecoEmpresa ? <p className="mt-1">{enderecoEmpresa}</p> : null}
        {telefoneEmpresa ? (
          <p className="mt-1 font-data">{telefoneEmpresa}</p>
        ) : null}
      </header>

      <p className="border-t border-dashed border-zinc-400 pt-2 font-medium">
        Pedido #{pedido.numero}
      </p>
      <p className="font-data">{formatarDataHora(pedido.data)}</p>

      <div className="mt-2 border-t border-dashed border-zinc-400 pt-2">
        <p className="font-medium">{pedido.clienteNome}</p>
        {pedido.clienteDocumento ? (
          <p className="font-data">
            {pedido.clienteDocumento.rotulo} {pedido.clienteDocumento.valor}
          </p>
        ) : null}
        <p>Tel: {pedido.clienteTelefone}</p>
        <p className="break-words [overflow-wrap:anywhere]">
          End: {pedido.clienteEndereco}
        </p>
      </div>

      <ul className="mt-3 border-t border-dashed border-zinc-400 pt-2">
        {pedido.itens.map((item) => (
          <li key={item.id} className="mb-2">
            <p className="font-medium">{item.nome}</p>
            <p className="flex justify-between gap-2 font-data">
              <span>
                {item.quantidade} × {item.precoUnitario}
              </span>
              <span>{item.subtotal}</span>
            </p>
            {item.observacao ? (
              <p className="break-words text-[11px]">{item.observacao}</p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="border-t border-dashed border-zinc-400 pt-2">
        <p className="flex justify-between gap-2">
          <span>Subtotal</span>
          <span className="font-data">{formatarPreco(pedido.subtotal)}</span>
        </p>
        {Number(pedido.desconto) > 0 ? (
          <p className="flex justify-between gap-2">
            <span>Desconto</span>
            <span className="font-data">{formatarPreco(pedido.desconto)}</span>
          </p>
        ) : null}
        <p className="mt-2 flex justify-between gap-2 text-[14px] font-semibold">
          <span>Total</span>
          <span className="font-data">{formatarPreco(pedido.total)}</span>
        </p>
      </div>

      <p className="mt-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        Obs: {pedido.observacao?.trim() || "não informado"}
      </p>

      <BlocoAssinaturaPedido
        compacto
        entregueEm={pedido.entregueEm}
        recebidoPorNome={pedido.recebidoPorNome}
      />
    </article>
  );
}
