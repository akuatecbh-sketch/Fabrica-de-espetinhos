"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatarDataHora, formatarPreco, formatarQuantidade } from "@/lib/format";
import { emitirNfe } from "./actions";

export type NfeListaItem = {
  id: number;
  venda_id: number;
  numero: number | null;
  status: string;
  valor_total: string;
  data_emissao: string | null;
  mensagem_sefaz: string | null;
  xml_url: string | null;
  danfe_url: string | null;
  clienteNome: string;
  itens: {
    id: number;
    descricao: string;
    quantidade: string;
    valor_total: string;
    valor_icms: string;
    valor_ipi: string;
    valor_pis: string;
    valor_cofins: string;
  }[];
};

function rotuloStatus(status: string) {
  switch (status) {
    case "simulado":
      return "Simulada";
    case "autorizada":
      return "Autorizada";
    case "rejeitada":
      return "Rejeitada";
    case "pendente":
      return "Pendente";
    case "cancelada":
      return "Cancelada";
    case "contingencia":
      return "Contingência";
    default:
      return status;
  }
}

function classeStatus(status: string) {
  switch (status) {
    case "autorizada":
      return "bg-verde-bg text-verde-texto";
    case "rejeitada":
      return "bg-coral-bg text-coral-texto";
    case "pendente":
    case "contingencia":
      return "bg-ambar-bg text-ambar-texto";
    default:
      return "bg-zinc-100 text-zinc-600";
  }
}

export function ListaNfe({ notas }: { notas: NfeListaItem[] }) {
  const router = useRouter();
  const [aberta, setAberta] = useState<number | null>(null);
  const [pendenteId, setPendenteId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function tentarNovamente(vendaId: number) {
    setErro(null);
    setPendenteId(vendaId);
    startTransition(async () => {
      const resultado = await emitirNfe(vendaId);
      setPendenteId(null);
      router.refresh();
      if (resultado.error) {
        setErro(resultado.error);
      }
    });
  }

  if (notas.length === 0) {
    return (
      <p className="text-sm text-zinc-600">Nenhuma NF-e emitida ainda.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {erro ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      ) : null}
      {notas.map((nota) => {
        const expandida = aberta === nota.id;
        const podeRetentar =
          nota.status === "pendente" || nota.status === "rejeitada";
        return (
          <article
            key={nota.id}
            className="rounded-lg border border-zinc-200 bg-white"
          >
            <button
              type="button"
              onClick={() => setAberta(expandida ? null : nota.id)}
              className="flex w-full flex-wrap items-start justify-between gap-3 px-4 py-3 text-left"
            >
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-zinc-900">
                  NF-e {nota.numero != null ? `nº ${nota.numero}` : "sem número"}
                  <span
                    className={`ml-2 inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${classeStatus(nota.status)}`}
                  >
                    {rotuloStatus(nota.status)}
                  </span>
                </p>
                <p className="text-sm text-zinc-600">{nota.clienteNome}</p>
                <p className="text-xs text-zinc-500">
                  {nota.data_emissao
                    ? formatarDataHora(new Date(nota.data_emissao))
                    : "Sem data de emissão"}
                </p>
              </div>
              <p className="font-data text-sm font-medium">
                {formatarPreco(nota.valor_total)}
              </p>
            </button>

            {expandida ? (
              <div className="border-t border-zinc-200 px-4 py-3">
                {nota.mensagem_sefaz ? (
                  <p className="mb-3 text-sm text-zinc-600">
                    {nota.mensagem_sefaz}
                  </p>
                ) : null}

                {nota.itens.length === 0 ? (
                  <p className="text-sm text-zinc-600">
                    Nenhum item gravado nesta nota.
                  </p>
                ) : (
                  <>
                    <ul className="flex flex-col gap-3 md:hidden">
                      {nota.itens.map((item) => (
                        <li key={item.id} className="text-sm">
                          <p className="font-medium">{item.descricao}</p>
                          <p className="font-data text-zinc-600">
                            {formatarQuantidade(item.quantidade)} ·{" "}
                            {formatarPreco(item.valor_total)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            ICMS {formatarPreco(item.valor_icms)} · IPI{" "}
                            {formatarPreco(item.valor_ipi)} · PIS{" "}
                            {formatarPreco(item.valor_pis)} · COFINS{" "}
                            {formatarPreco(item.valor_cofins)}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <table className="hidden min-w-full text-left text-sm md:table">
                      <thead className="text-zinc-600">
                        <tr>
                          <th className="py-1 pr-3 font-medium">Produto</th>
                          <th className="py-1 pr-3 font-medium">Qtd</th>
                          <th className="py-1 pr-3 font-medium">Valor</th>
                          <th className="py-1 pr-3 font-medium">ICMS</th>
                          <th className="py-1 pr-3 font-medium">IPI</th>
                          <th className="py-1 pr-3 font-medium">PIS</th>
                          <th className="py-1 font-medium">COFINS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nota.itens.map((item) => (
                          <tr key={item.id} className="border-t border-zinc-100">
                            <td className="py-1.5 pr-3">{item.descricao}</td>
                            <td className="py-1.5 pr-3 font-data">
                              {formatarQuantidade(item.quantidade)}
                            </td>
                            <td className="py-1.5 pr-3 font-data">
                              {formatarPreco(item.valor_total)}
                            </td>
                            <td className="py-1.5 pr-3 font-data">
                              {formatarPreco(item.valor_icms)}
                            </td>
                            <td className="py-1.5 pr-3 font-data">
                              {formatarPreco(item.valor_ipi)}
                            </td>
                            <td className="py-1.5 pr-3 font-data">
                              {formatarPreco(item.valor_pis)}
                            </td>
                            <td className="py-1.5 font-data">
                              {formatarPreco(item.valor_cofins)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                <div className="mt-3 flex flex-wrap gap-3">
                  {podeRetentar ? (
                    <button
                      type="button"
                      disabled={pendente && pendenteId === nota.venda_id}
                      onClick={() => tentarNovamente(nota.venda_id)}
                      className="min-h-11 rounded border border-borda bg-superficie px-3 py-2 text-sm text-texto-primario hover:bg-fundo-hover disabled:opacity-60 md:min-h-0"
                    >
                      {pendente && pendenteId === nota.venda_id
                        ? "Enviando..."
                        : "Tentar novamente"}
                    </button>
                  ) : null}
                  {nota.status === "autorizada" && nota.xml_url ? (
                    <a
                      href={nota.xml_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-brasa underline-offset-2 hover:underline"
                    >
                      Baixar XML
                    </a>
                  ) : null}
                  {nota.status === "autorizada" && nota.danfe_url ? (
                    <a
                      href={nota.danfe_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-brasa underline-offset-2 hover:underline"
                    >
                      Baixar DANFE
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
