"use client";

import { useState, useTransition } from "react";
import { formatarDataHora } from "@/lib/format";
import { motivoConfirmarEntregaIndisponivel } from "@/lib/pedido";
import { confirmarEntregaPedido } from "./actions";

export function ConfirmarEntregaPedido({
  pedidoId,
  status,
  entregueEm,
  recebidoPorNome,
}: {
  pedidoId: number;
  status: string;
  entregueEm: Date | null;
  recebidoPorNome: string | null;
}) {
  const [nome, setNome] = useState(recebidoPorNome ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const motivo = motivoConfirmarEntregaIndisponivel(status, Boolean(entregueEm));

  if (entregueEm) {
    return (
      <p className="rounded border border-verde-sucesso/40 bg-verde-sucesso/10 px-3 py-2 text-sm text-texto-primario">
        Entrega registrada em {formatarDataHora(entregueEm)}
        {recebidoPorNome?.trim() ? ` · Recebido por ${recebidoPorNome.trim()}` : ""}.
      </p>
    );
  }

  if (motivo) return null;

  return (
    <form
      className="flex flex-col gap-2 rounded border border-borda p-3"
      onSubmit={(evento) => {
        evento.preventDefault();
        setErro(null);
        startTransition(async () => {
          const resultado = await confirmarEntregaPedido(pedidoId, nome);
          if (resultado.error) setErro(resultado.error);
        });
      }}
    >
      <p className="text-sm font-medium text-texto-primario">
        Confirmar entrega/recebimento
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Nome de quem recebeu
        <input
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          placeholder="Nome de quem conferiu o pedido"
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>
      {erro ? <p className="text-sm text-vermelho-erro">{erro}</p> : null}
      <button
        type="submit"
        disabled={pendente || nome.trim().length < 2}
        className="min-h-11 w-fit rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Registrando..." : "Confirmar entrega/recebimento"}
      </button>
    </form>
  );
}
