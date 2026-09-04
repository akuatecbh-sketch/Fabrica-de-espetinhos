import Link from "next/link";
import { formatarCpf, formatarTelefone } from "@/lib/documento";
import { CardRegistro } from "../card-registro";
import { ExcluirClienteButton } from "./excluir-button";

type ClienteLista = {
  id: number;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
};

function AcoesCliente({ cliente }: { cliente: ClienteLista }) {
  return (
    <>
      <Link
        href={`/clientes/${cliente.id}/editar`}
        className="inline-flex min-h-11 items-center text-texto-primario underline-offset-2 hover:underline md:min-h-0"
      >
        Editar
      </Link>
      <ExcluirClienteButton id={cliente.id} nome={cliente.nome} />
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
        {clientes.map((cliente) => (
          <li key={cliente.id}>
            <CardRegistro acoes={<AcoesCliente cliente={cliente} />}>
              <p className="font-medium text-texto-primario">{cliente.nome}</p>
              <p className="font-data text-sm text-texto-primario">
                {formatarCpf(cliente.cpf)}
              </p>
              <p className="text-sm text-texto-secundario">
                {formatarTelefone(cliente.telefone) || "Sem telefone"}
              </p>
              <p className="text-xs text-texto-secundario">
                {cliente.email || "Sem e-mail"}
              </p>
            </CardRegistro>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">CPF</th>
              <th className="px-3 py-2 font-medium">Telefone</th>
              <th className="px-3 py-2 font-medium">E-mail</th>
              <th className="px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <tr
                key={cliente.id}
                className="border-b border-zinc-100 last:border-0"
              >
                <td className="px-3 py-2">{cliente.nome}</td>
                <td className="px-3 py-2 font-mono">{formatarCpf(cliente.cpf)}</td>
                <td className="px-3 py-2">{formatarTelefone(cliente.telefone)}</td>
                <td className="px-3 py-2">{cliente.email || "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-start gap-3">
                    <AcoesCliente cliente={cliente} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
