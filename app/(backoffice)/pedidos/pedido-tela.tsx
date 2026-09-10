import Link from "next/link";
import {
  classesStatusPedido,
  pedidoEditavel,
  rotuloStatusPedido,
} from "@/lib/pedido";
import { AcoesPedido } from "./acoes-pedido";
import { BadgeSituacaoPedido } from "./badge-situacao";
import { ClientePedido } from "./cliente-pedido";
import { CopiarLinkRevisao } from "./copiar-link-revisao";
import { ItensPedido, type ItemPedidoExibicao } from "./itens-pedido";
import { ObservacaoPedido } from "./observacao-pedido";
import { PedidoBuscaProduto } from "./busca-produto";

export type PedidoTelaDados = {
  id: number;
  numero: number;
  status: string;
  observacao: string | null;
  tokenPublico: string | null;
  total: { toString(): string };
  cliente: { id: number; nome: string } | null;
  itens: ItemPedidoExibicao[];
};

export function PedidoTela({
  pedido,
  forcarLeitura = false,
}: {
  pedido: PedidoTelaDados | null;
  forcarLeitura?: boolean;
}) {
  const editavelPorStatus = pedido == null || pedidoEditavel(pedido.status);
  const editavel = editavelPorStatus && !forcarLeitura;
  const somenteLeitura = !editavel;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/pedidos" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para pedidos
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {pedido ? `Pedido #${pedido.numero}` : "Novo pedido"}
          </h1>
          {pedido ? (
            <BadgeSituacaoPedido pedidoId={pedido.id} status={pedido.status} />
          ) : (
            <span className={classesStatusPedido("aberto")}>
              {rotuloStatusPedido("aberto")}
            </span>
          )}
        </div>
        {forcarLeitura && pedido && editavelPorStatus ? (
          <p className="mt-2 text-sm text-texto-secundario">
            Somente leitura.{" "}
            <Link
              href={`/pedidos/${pedido.id}`}
              className="font-medium text-texto-primario underline-offset-2 hover:underline"
            >
              Editar este pedido
            </Link>
          </p>
        ) : null}
        {!editavelPorStatus ? (
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

      {pedido?.tokenPublico || (pedido && editavel) ? (
        <div className="flex flex-col gap-4 border-t border-borda pt-4">
          {pedido.tokenPublico ? (
            <CopiarLinkRevisao token={pedido.tokenPublico} />
          ) : null}
          {editavel ? (
            <AcoesPedido
              pedidoId={pedido.id}
              status={pedido.status}
              temItens={pedido.itens.length > 0}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
