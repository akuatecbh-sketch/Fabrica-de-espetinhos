"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { formatarPreco } from "@/lib/format";

function respeitaMovimentoReduzido() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ContagemValor({
  valor,
  tipo = "moeda",
  className = "",
}: {
  valor: number;
  tipo?: "moeda" | "inteiro";
  className?: string;
}) {
  const [atual, setAtual] = useState(valor);

  useLayoutEffect(() => {
    if (respeitaMovimentoReduzido() || valor === 0) return;
    setAtual(0);
  }, [valor]);

  useEffect(() => {
    if (respeitaMovimentoReduzido() || valor === 0) {
      setAtual(valor);
      return;
    }

    const duracao = 800;
    const inicio = performance.now();
    let quadro = 0;

    function tick(agora: number) {
      const progresso = Math.min((agora - inicio) / duracao, 1);
      const eased = 1 - (1 - progresso) ** 3;
      setAtual(valor * eased);
      if (progresso < 1) {
        quadro = requestAnimationFrame(tick);
      }
    }

    quadro = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(quadro);
  }, [valor]);

  const texto =
    tipo === "moeda"
      ? formatarPreco(atual)
      : new Intl.NumberFormat("pt-BR").format(Math.round(atual));

  return <span className={`font-data ${className}`}>{texto}</span>;
}
