"use client";

import Link from "next/link";
import {
  motivoCancelarIndisponivel,
  motivoEditarIndisponivel,
  precisaAvisarEdicaoAposEnvio,
} from "@/lib/pedido";
import { BotaoCancelarPedido } from "./cancelar-pedido-dialog";

export type PedidoAcoesLista = {
  id: number;
  numero: number;
  status: string;
};

const classeLink =
  "inline-flex min-h-11 items-center text-texto-primario underline-offset-2 hover:underline md:min-h-0";
const classeDesabilitada =
  "inline-flex min-h-11 cursor-not-allowed items-center text-zinc-400 opacity-60 md:min-h-0";

const AVISO_EDICAO =
  "Este pedido já foi enviado ao cliente. Ele pode ter visto o link. Se você alterar, a aprovação anterior será invalidada e o cliente precisará aprovar de novo. O link do WhatsApp continua o mesmo. Continuar?";

export function AcoesListaPedido({
  pedido,
  podeCancelarPedido,
}: {
  pedido: PedidoAcoesLista;
  podeCancelarPedido: boolean;
}) {
  const motivoEditar = motivoEditarIndisponivel(pedido.status);
  const motivoCancelar = motivoCancelarIndisponivel(
    pedido.status,
    podeCancelarPedido,
  );
  const avisarEdicao = precisaAvisarEdicaoAposEnvio(pedido.status);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Link href={`/pedidos/${pedido.id}/imprimir`} className={classeLink}>
        Imprimir
      </Link>
      {motivoEditar ? (
        <span title={motivoEditar} className={classeDesabilitada}>
          Editar
        </span>
      ) : (
        <Link
          href={`/pedidos/${pedido.id}`}
          className={classeLink}
          onClick={(evento) => {
            if (avisarEdicao && !confirm(AVISO_EDICAO)) {
              evento.preventDefault();
            }
          }}
        >
          Editar
        </Link>
      )}
      <BotaoCancelarPedido
        pedidoId={pedido.id}
        numero={pedido.numero}
        disabled={Boolean(motivoCancelar)}
        title={motivoCancelar ?? undefined}
      />
    </div>
  );
}
