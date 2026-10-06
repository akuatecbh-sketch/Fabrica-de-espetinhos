"use client";

import Link from "next/link";
import { BotoesExportacao, baixarCsv, slugArquivo } from "../exportacao-relatorio";
import { CardRegistro } from "../card-registro";
import { formatarData, formatarPreco, formatarQuantidade } from "@/lib/format";

export type ItemHistoricoProducao = {
  id: number;
  data: Date;
  quantidade: number;
  custoTotal: number;
  status: string;
  observacao: string | null;
  produtoNome: string;
  unidade: string;
  usuarioNome: string;
};

function rotuloStatus(status: string) {
  return status === "cancelada" ? "Cancelada" : "Confirmada";
}

export function ListaHistoricoProducao({
  itens,
  de,
  ate,
}: {
  itens: ItemHistoricoProducao[];
  de: string;
  ate: string;
}) {
  function exportar() {
    baixarCsv(
      slugArquivo(`producao-${de}-a-${ate}`),
      [
        [
          "ID",
          "Data",
          "Produto",
          "Quantidade",
          "Unidade",
          "Custo",
          "Status",
          "Usuário",
          "Observação",
        ],
        ...itens.map((item) => [
          String(item.id),
          formatarData(item.data),
          item.produtoNome,
          formatarQuantidade(item.quantidade),
          item.unidade,
          formatarPreco(item.custoTotal),
          rotuloStatus(item.status),
          item.usuarioNome,
          item.observacao ?? "",
        ]),
      ],
    );
  }

  if (itens.length === 0) {
    return (
      <p className="text-sm text-texto-secundario">
        Nenhuma produção neste período.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <BotoesExportacao onExportarCsv={exportar} />

      <ul className="flex flex-col gap-3 md:hidden">
        {itens.map((item) => (
          <li key={item.id}>
            <CardRegistro
              acoes={
                <Link
                  href={`/producao/${item.id}`}
                  className="text-sm font-medium text-texto-primario underline-offset-2 hover:underline"
                >
                  Ver detalhe
                </Link>
              }
            >
              <p className="font-medium text-texto-primario">
                #{item.id} · {item.produtoNome}
              </p>
              <p className="font-data text-sm text-texto-secundario">
                {formatarData(item.data)} · {formatarQuantidade(item.quantidade)}{" "}
                {item.unidade} · {formatarPreco(item.custoTotal)}
              </p>
              <p className="text-sm text-texto-secundario">
                {rotuloStatus(item.status)} · {item.usuarioNome}
              </p>
            </CardRegistro>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Produto</th>
              <th className="px-3 py-2 font-medium">Quantidade</th>
              <th className="px-3 py-2 font-medium">Custo</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Usuário</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr
                key={item.id}
                className="border-b border-zinc-100 last:border-0"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/producao/${item.id}`}
                    className="font-medium text-texto-primario underline-offset-2 hover:underline"
                  >
                    #{item.id}
                  </Link>
                </td>
                <td className="px-3 py-2 font-data">{formatarData(item.data)}</td>
                <td className="px-3 py-2">{item.produtoNome}</td>
                <td className="px-3 py-2 font-data">
                  {formatarQuantidade(item.quantidade)} {item.unidade}
                </td>
                <td className="px-3 py-2 font-data">
                  {formatarPreco(item.custoTotal)}
                </td>
                <td className="px-3 py-2">{rotuloStatus(item.status)}</td>
                <td className="px-3 py-2">{item.usuarioNome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
