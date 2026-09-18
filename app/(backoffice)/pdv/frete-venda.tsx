"use client";

import { useState, useTransition } from "react";
import { arredondarDinheiro } from "@/lib/dinheiro";
import { definirFrete } from "./actions";

function valorDeDigitos(bruto: string) {
  const soDigitos = bruto.replace(/\D/g, "");
  return arredondarDinheiro(Number(soDigitos || "0") / 100);
}

function formatarCampoMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function digitosDeValor(valor: number | null) {
  if (valor == null || !Number.isFinite(valor) || valor <= 0) return "";
  return String(Math.round(arredondarDinheiro(valor) * 100));
}

export function FreteVenda({
  vendaId,
  valorAtual,
}: {
  vendaId: number;
  valorAtual: number | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [digitos, setDigitos] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const valor = valorDeDigitos(digitos);

  function abrir() {
    setErro(null);
    setDigitos(digitosDeValor(valorAtual));
    setAberto(true);
  }

  function cancelar() {
    if (pendente) return;
    setAberto(false);
    setErro(null);
  }

  function confirmar() {
    if (valor <= 0) {
      setErro("Informe o valor do frete.");
      return;
    }
    startTransition(async () => {
      const resultado = await definirFrete(vendaId, valor);
      if (resultado.error) {
        setErro(resultado.error);
        return;
      }
      setAberto(false);
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={abrir}
        className="min-h-11 w-fit rounded border border-borda bg-superficie px-3 py-2 text-sm font-medium text-texto-primario hover:bg-fundo-hover lg:min-h-0"
      >
        Frete
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded border border-zinc-200 bg-white px-3 py-2">
      <label className="flex flex-col gap-1 text-sm">
        Valor do frete
        <input
          inputMode="numeric"
          autoFocus
          value={formatarCampoMoeda(valor)}
          onChange={(evento) =>
            setDigitos(evento.target.value.replace(/\D/g, ""))
          }
          onKeyDown={(evento) => {
            if (evento.key === "Enter") {
              evento.preventDefault();
              confirmar();
            }
            if (evento.key === "Escape") {
              evento.preventDefault();
              cancelar();
            }
          }}
          disabled={pendente}
          className="font-data min-h-11 w-40 rounded border border-borda px-2 py-1 text-sm lg:min-h-0"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={confirmar}
          disabled={pendente}
          className="min-h-11 rounded bg-gradiente-brasa px-3 py-1 text-sm font-medium text-white disabled:opacity-60 lg:min-h-0"
        >
          {pendente ? "Confirmando..." : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={cancelar}
          disabled={pendente}
          className="min-h-11 rounded border border-borda bg-superficie px-3 py-1 text-sm text-texto-primario hover:bg-fundo-hover disabled:opacity-60 lg:min-h-0"
        >
          Cancelar
        </button>
      </div>
      {erro ? <span className="text-xs text-red-700">{erro}</span> : null}
    </div>
  );
}
