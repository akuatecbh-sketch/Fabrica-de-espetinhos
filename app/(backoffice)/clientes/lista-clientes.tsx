import Link from "next/link";
import { formatarCnpjCpf, formatarTelefone } from "@/lib/documento";
import {
  documentoCliente,
  ehPessoaJuridica,
  nomeExibicaoCliente,
} from "@/lib/cliente";
import { CardRegistro } from "../card-registro";
import { ExcluirClienteButton } from "./excluir-button";

type ClienteLista = {
  id: number;
  tipo_pessoa: string;
  nome: string;
  cpf: string | null;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  telefone: string | null;
  email: string | null;
};

function BadgeTipo({ tipo }: { tipo: string }) {
  const pj = ehPessoaJuridica(tipo);
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
        pj
          ? "bg-violet-100 text-violet-800"
          : "bg-zinc-100 text-zinc-700"
      }`}
    >
      {pj ? "PJ" : "PF"}
    </span>
  );
}

function AcoesCliente({
  cliente,
  nome,
}: {
  cliente: ClienteLista;
  nome: string;
}) {
  return (
    <>
      <Link
        href={`/clientes/${cliente.id}/editar`}
        className="inline-flex min-h-11 items-center text-texto-primario underline-offset-2 hover:underline md:min-h-0"
      >
        Editar
      </Link>
      <ExcluirClienteButton id={cliente.id} nome={nome} />
    </>
  );
}

export function ListaClientes({
  clientes,
  vazio,
}: {
  clientes: ClienteLista[];
  vazio: string;
}) {
  if (clientes.length === 0) {
    return <p className="text-sm text-texto-secundario">{vazio}</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {clientes.map((cliente) => {
          const nome = nomeExibicaoCliente(cliente);
          return (
            <li key={cliente.id}>
              <CardRegistro
                acoes={<AcoesCliente cliente={cliente} nome={nome} />}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-texto-primario">{nome}</p>
                  <BadgeTipo tipo={cliente.tipo_pessoa} />
                </div>
                <p className="font-data text-sm text-texto-primario">
                  {formatarCnpjCpf(documentoCliente(cliente))}
                </p>
                <p className="text-sm text-texto-secundario">
                  {formatarTelefone(cliente.telefone) || "Sem telefone"}
                </p>
                <p className="text-xs text-texto-secundario">
                  {cliente.email || "Sem e-mail"}
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
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">CPF / CNPJ</th>
              <th className="px-3 py-2 font-medium">Telefone</th>
              <th className="px-3 py-2 font-medium">E-mail</th>
              <th className="px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => {
              const nome = nomeExibicaoCliente(cliente);
              return (
                <tr
                  key={cliente.id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="px-3 py-2">
                    <BadgeTipo tipo={cliente.tipo_pessoa} />
                  </td>
                  <td className="px-3 py-2">{nome}</td>
                  <td className="px-3 py-2 font-mono">
                    {formatarCnpjCpf(documentoCliente(cliente))}
                  </td>
                  <td className="px-3 py-2">
                    {formatarTelefone(cliente.telefone)}
                  </td>
                  <td className="px-3 py-2">{cliente.email || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-start gap-3">
                      <AcoesCliente cliente={cliente} nome={nome} />
                    </div>
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
