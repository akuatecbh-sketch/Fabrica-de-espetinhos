import { formatarData, formatarPreco } from "@/lib/format";
import {
  contaAtrasada,
  dataLocalISO,
  rotuloStatusConta,
  classesBadgeStatus,
} from "@/lib/financeiro";
import { CardRegistro } from "../card-registro";
import { MarcarRecebidaForm } from "./marcar-recebida-form";

type Conta = {
  id: number;
  descricao: string;
  valor: { toString(): string };
  data_vencimento: Date;
  data_recebimento: Date | null;
  status: string;
  cliente: { nome: string } | null;
};

function AcoesReceber({ conta }: { conta: Conta }) {
  if (conta.status === "aberta" || conta.status === "atrasada") {
    return <MarcarRecebidaForm id={conta.id} />;
  }
  if (conta.data_recebimento) {
    return (
      <span className="text-sm text-texto-secundario">
        Recebida em {formatarData(conta.data_recebimento)}
      </span>
    );
  }
  return <span className="text-sm text-texto-secundario">—</span>;
}

export function ListaReceber({ contas }: { contas: Conta[] }) {
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
              <CardRegistro acoes={<AcoesReceber conta={conta} />}>
                <p className="font-medium text-texto-primario">{conta.descricao}</p>
                <p className="font-data text-lg font-semibold text-texto-primario">
                  {formatarPreco(conta.valor)}
                </p>
                <p className="text-sm text-texto-secundario">
                  Vence {formatarData(conta.data_vencimento)}
                </p>
                <span className={`mt-1 w-fit ${classesBadgeStatus(conta.status, atrasada)}`}>
                  {atrasada ? "Atrasada" : rotuloStatusConta(conta.status)}
                </span>
                <p className="text-xs text-texto-secundario">
                  {conta.cliente?.nome ?? "Sem cliente"}
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
              <th className="px-3 py-2 font-medium">Cliente</th>
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
                  <td className="px-3 py-2">{conta.descricao}</td>
                  <td className="px-3 py-2">{conta.cliente?.nome ?? "—"}</td>
                  <td className="px-3 py-2 font-data">{formatarPreco(conta.valor)}</td>
                  <td className="px-3 py-2">
                    <span className={classesBadgeStatus(conta.status, atrasada)}>
                      {atrasada ? "Atrasada" : rotuloStatusConta(conta.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <AcoesReceber conta={conta} />
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
