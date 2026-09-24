"use client";

import { useEffect, useState } from "react";

export function CopiarLinkRevisao({
  token,
  telefone,
  nomeCliente,
}: {
  token: string;
  telefone?: string | null;
  nomeCliente?: string | null;
}) {
  const path = `/pedidos/publico/${token}`;
  const [url, setUrl] = useState(path);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const publico = `${window.location.origin}${path}`;
    setUrl(publico);

    const numero = (telefone ?? "").replace(/\D/g, "");
    if (!numero) {
      setWhatsapp(null);
      return;
    }

    const comPais = numero.startsWith("55") ? numero : `55${numero}`;
    const nome = (nomeCliente ?? "").trim() || "cliente";
    const mensagem = `Olá, ${nome}! Segue o seu pedido para revisão: ${publico}. Qualquer dúvida, é só chamar.`;
    setWhatsapp(
      `https://wa.me/${comPais}?text=${encodeURIComponent(mensagem)}`,
    );
  }, [path, telefone, nomeCliente]);

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
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void copiar()}
          className="min-h-11 w-fit rounded border border-borda bg-superficie px-3 py-2 text-sm font-medium text-texto-primario hover:bg-fundo-hover lg:min-h-0"
        >
          {copiado ? "Copiado" : "Copiar"}
        </button>
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-11 w-fit rounded bg-[#25D366] px-3 py-2 text-sm font-medium text-white hover:brightness-95 lg:min-h-0"
          >
            Enviar pelo WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}
