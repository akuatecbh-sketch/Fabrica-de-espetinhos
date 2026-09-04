import { formatarData, formatarPreco } from "@/lib/format";
import {
  contaAtrasada,
  dataLocalISO,
  rotuloStatusConta,
  classesBadgeStatus,
} from "@/lib/financeiro";
import { CardRegistro } from "../card-registro";
import { MarcarPagaForm } from "./marcar-paga-form";

type Conta = {
  id: number;
  descricao: string;
  valor: { toString(): string };
  data_vencimento: Date;
  data_pagamento: Date | null;
  status: string;
  recorrente: boolean;
  fornecedor: { razao_social: string; nome_fantasia: string | null } | null;
  categoria_financeira: { nome: string };
};

function AcoesPagar({
  conta,
}: {
  conta: Conta;
}) {
  if (conta.status === "aberta" || conta.status === "atrasada") {
    return <MarcarPagaForm id={conta.id} />;
  }
  if (conta.data_pagamento) {
    return (
      <span className="text-sm text-texto-secundario">
        Paga em {formatarData(conta.data_pagamento)}
      </span>
    );
  }
  return <span className="text-sm text-texto-secundario">—</span>;
}

export function ListaPagar({ contas }: { contas: Conta[] }) {
  const hoje = dataLocalISO();

  if (contas.length === 0) {
    return <p className="text-sm text-texto-secundario">Nenhum registro</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {contas.map((conta) => {
          const atrasada = contaAtrasada(
            conta.status,
            conta.data_vencimento,
            hoje,
          );
          return (
            <li key={conta.id}>
              <CardRegistro acoes={<AcoesPagar conta={conta} />}>
                <p className="font-medium text-texto-primario">{conta.descricao}</p>
                <p className="font-data text-lg font-semibold text-texto-primario">
                  {formatarPreco(conta.valor)}
                </p>
                <p className="text-sm text-texto-secundario">
                  Vence {formatarData(conta.data_vencimento)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className={classesBadgeStatus(conta.status, atrasada)}>
                    {atrasada ? "Atrasada" : rotuloStatusConta(conta.status)}
                  </span>
                  {conta.recorrente ? (
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-texto-secundario">
                      Recorrente
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-texto-secundario">
                  {conta.categoria_financeira.nome}
                  {" · "}
                  {conta.fornecedor
                    ? conta.fornecedor.nome_fantasia ||
                      conta.fornecedor.razao_social
                    : "Sem fornecedor"}
                </p>
              </CardRegistro>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 font-medium">Vencimento</th>
              <th className="px-3 py-2 font-medium">Descrição</th>
              <th className="px-3 py-2 font-medium">Categoria</th>
              <th className="px-3 py-2 font-medium">Fornecedor</th>
              <th className="px-3 py-2 font-medium">Valor</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {contas.map((conta) => {
              const atrasada = contaAtrasada(
                conta.status,
                conta.data_vencimento,
                hoje,
              );
              return (
                <tr
                  key={conta.id}
                  className={`border-b border-zinc-100 last:border-0 ${
                    atrasada ? "bg-red-50" : ""
                  }`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatarData(conta.data_vencimento)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col items-start gap-1">
                      <span>{conta.descricao}</span>
                      {conta.recorrente ? (
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                          Recorrente
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">{conta.categoria_financeira.nome}</td>
                  <td className="px-3 py-2">
                    {conta.fornecedor
                      ? conta.fornecedor.nome_fantasia ||
                        conta.fornecedor.razao_social
                      : "—"}
                  </td>
                  <td className="px-3 py-2 font-data">{formatarPreco(conta.valor)}</td>
                  <td className="px-3 py-2">
                    <span className={classesBadgeStatus(conta.status, atrasada)}>
                      {atrasada ? "Atrasada" : rotuloStatusConta(conta.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <AcoesPagar conta={conta} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
