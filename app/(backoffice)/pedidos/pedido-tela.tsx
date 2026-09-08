import Link from "next/link";
import {
  classesStatusPedido,
  pedidoEditavel,
  rotuloStatusPedido,
} from "@/lib/pedido";
import { AcoesPedido } from "./acoes-pedido";
import { ClientePedido } from "./cliente-pedido";
import { ItensPedido, type ItemPedidoExibicao } from "./itens-pedido";
import { ObservacaoPedido } from "./observacao-pedido";
import { PedidoBuscaProduto } from "./busca-produto";

export type PedidoTelaDados = {
  id: number;
  numero: number;
  status: string;
  observacao: string | null;
  total: { toString(): string };
  cliente: { id: number; nome: string } | null;
  itens: ItemPedidoExibicao[];
};

export function PedidoTela({ pedido }: { pedido: PedidoTelaDados | null }) {
  const editavel = pedido == null || pedidoEditavel(pedido.status);
  const somenteLeitura = !editavel;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/pedidos" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para pedidos
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {pedido ? `Pedido #${pedido.numero}` : "Novo pedido"}
            </h1>
            <span
              className={classesStatusPedido(pedido?.status ?? "aberto")}
            >
              {rotuloStatusPedido(pedido?.status ?? "aberto")}
            </span>
          </div>
          {pedido ? (
            <AcoesPedido pedidoId={pedido.id} status={pedido.status} />
          ) : null}
        </div>
        {somenteLeitura ? (
          <p className="mt-2 text-sm text-texto-secundario">
            Este pedido não pode mais ser alterado.
          </p>
        ) : null}
      </div>

      <ClientePedido
        pedidoId={pedido?.id ?? null}
        cliente={pedido?.cliente ?? null}
        somenteLeitura={somenteLeitura}
      />

      <div
        className={
          editavel
            ? "flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-6"
            : "flex flex-col gap-6"
        }
      >
        {editavel ? <PedidoBuscaProduto pedidoId={pedido?.id ?? null} /> : null}

        <ItensPedido
          itens={pedido?.itens ?? []}
          editavel={editavel}
          total={pedido?.total ?? "0"}
        />
      </div>

      <ObservacaoPedido
        pedidoId={pedido?.id ?? null}
        observacao={pedido?.observacao ?? ""}
        somenteLeitura={somenteLeitura}
      />
    </div>
  );
}
