"use client";

import { useEffect, useState } from "react";

function horaAtual() {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

export function RelogioPainel() {
  const [hora, setHora] = useState<string | null>(null);

  useEffect(() => {
    function atualizar() {
      setHora(horaAtual());
    }

    atualizar();
    const id = window.setInterval(atualizar, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="font-data tabular-nums">{hora ?? "--:--:--"}</span>
  );
}
