"use client";

import { useRouter } from "next/navigation";
import { useTransition, type MouseEvent } from "react";
import { tentarEmitirNfce } from "../nfce-actions";

export type NfceResumo = {
  status: string;
  mensagem_sefaz: string | null;
  danfe_url: string | null;
};

const TOOLTIP_SIMULADA =
  "Não é uma nota fiscal válida. Configure FOCUS_NFE_TOKEN no .env para emitir de verdade.";

export function NfceBadge({
  vendaId,
  nfce,
}: {
  vendaId: number;
  nfce: NfceResumo | null;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const status = nfce?.status ?? "pendente";

  function retry(evento: MouseEvent) {
    evento.preventDefault();
    evento.stopPropagation();
    startTransition(async () => {
      await tentarEmitirNfce(vendaId);
      router.refresh();
    });
  }

  if (status === "simulado") {
    return (
      <div className="mt-1 flex flex-col items-start gap-0.5">
        <span
          title={TOOLTIP_SIMULADA}
          className="inline-flex items-center rounded border border-dashed border-zinc-400 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600"
        >
          Simulada
        </span>
        <span className="text-[11px] leading-tight text-zinc-500">
          Não é uma nota fiscal válida
        </span>
      </div>
    );
  }

  if (status === "autorizada") {
    const danfe = nfce?.danfe_url;
    const classe =
      "inline-flex items-center rounded bg-verde-bg px-2 py-0.5 text-xs font-medium text-verde-texto";
    if (danfe) {
      return (
        <div className="mt-1">
          <a
            href={danfe}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir DANFE"
            onClick={(evento) => evento.stopPropagation()}
            className={`${classe} underline-offset-2 hover:underline`}
          >
            Emitida
          </a>
        </div>
      );
    }
    return (
      <div className="mt-1">
        <span className={classe}>Emitida</span>
      </div>
    );
  }

  if (status === "rejeitada") {
    return (
      <div className="mt-1 flex max-w-sm flex-col items-start gap-1">
        <span className="inline-flex items-center rounded bg-coral-bg px-2 py-0.5 text-xs font-medium text-coral-texto">
          Rejeitada
        </span>
        {nfce?.mensagem_sefaz ? (
          <span className="text-[11px] leading-tight text-coral-texto">
            {nfce.mensagem_sefaz}
          </span>
        ) : null}
        <BotaoRetry pendente={pendente} onClick={retry} />
      </div>
    );
  }

  if (status === "cancelada") {
    return (
      <div className="mt-1">
        <span className="inline-flex items-center rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
          Cancelada
        </span>
      </div>
    );
  }

  if (status === "contingencia") {
    const danfe = nfce?.danfe_url;
    const classe =
      "inline-flex items-center rounded bg-ambar-bg px-2 py-0.5 text-xs font-medium text-ambar-texto";
    return (
      <div className="mt-1">
        {danfe ? (
          <a
            href={danfe}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(evento) => evento.stopPropagation()}
            className={`${classe} underline-offset-2 hover:underline`}
          >
            Contingência
          </a>
        ) : (
          <span className={classe}>Contingência</span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-1 flex flex-col items-start gap-1">
      <span className="inline-flex items-center rounded bg-ambar-bg px-2 py-0.5 text-xs font-medium text-ambar-texto">
        Pendente
      </span>
      {nfce?.mensagem_sefaz ? (
        <span className="max-w-sm text-[11px] leading-tight text-zinc-500">
          {nfce.mensagem_sefaz}
        </span>
      ) : null}
      <BotaoRetry pendente={pendente} onClick={retry} />
    </div>
  );
}

function BotaoRetry({
  pendente,
  onClick,
}: {
  pendente: boolean;
  onClick: (evento: MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={onClick}
      className="text-[11px] font-medium text-ambar-texto underline-offset-2 hover:underline disabled:opacity-60"
    >
      {pendente ? "Enviando..." : "Tentar novamente"}
    </button>
  );
}
