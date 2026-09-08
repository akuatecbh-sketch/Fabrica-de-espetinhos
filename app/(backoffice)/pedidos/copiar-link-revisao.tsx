"use client";

import { useEffect, useState } from "react";

export function CopiarLinkRevisao({ token }: { token: string }) {
  const path = `/pedidos/publico/${token}`;
  const [url, setUrl] = useState(path);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
  }, [path]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-borda bg-fundo p-3">
      <p className="text-sm font-medium">Link de revisão</p>
      <p className="break-all font-data text-xs text-texto-secundario">{url}</p>
      <button
        type="button"
        onClick={() => void copiar()}
        className="min-h-11 w-fit rounded border border-borda bg-superficie px-3 py-2 text-sm font-medium text-texto-primario hover:bg-fundo-hover lg:min-h-0"
      >
        {copiado ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
