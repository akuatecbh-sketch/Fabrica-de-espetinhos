import Link from "next/link";
import { formatarTelefone } from "@/lib/documento";
import { formatarData } from "@/lib/format";
import { CardRegistro } from "../card-registro";
import { DesligarButton } from "./desligar-button";

type FuncionarioLista = {
  id: number;
  nome: string;
  cargo: string;
  telefone: string | null;
  data_admissao: Date;
  ativo: boolean;
  aniversariante: boolean;
};

function AcoesFuncionario({ funcionario }: { funcionario: FuncionarioLista }) {
  return (
    <>
      <Link
        href={`/funcionarios/${funcionario.id}/editar`}
        className="inline-flex min-h-11 items-center text-texto-primario underline-offset-2 hover:underline md:min-h-0"
      >
        Editar
      </Link>
      <Link
        href={`/funcionarios/${funcionario.id}/ferias`}
        className="inline-flex min-h-11 items-center text-texto-primario underline-offset-2 hover:underline md:min-h-0"
      >
        Férias
      </Link>
      {funcionario.ativo ? (
        <DesligarButton id={funcionario.id} nome={funcionario.nome} />
      ) : null}
    </>
  );
}

function Badges({ funcionario }: { funcionario: FuncionarioLista }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      <span
        className={
          funcionario.ativo
            ? "rounded bg-verde-sucesso/10 px-2 py-0.5 text-xs font-medium text-verde-sucesso"
            : "rounded bg-vermelho-erro/10 px-2 py-0.5 text-xs font-medium text-vermelho-erro"
        }
      >
        {funcionario.ativo ? "Ativo" : "Inativo"}
      </span>
      {funcionario.aniversariante ? (
        <span className="rounded bg-ambar/10 px-2 py-0.5 text-xs font-medium text-ambar">
          Aniversariante
        </span>
      ) : null}
    </span>
  );
}

export function ListaFuncionarios({
  funcionarios,
  vazio,
}: {
  funcionarios: FuncionarioLista[];
  vazio: string;
}) {
  if (funcionarios.length === 0) {
    return <p className="text-sm text-texto-secundario">{vazio}</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {funcionarios.map((funcionario) => (
          <li key={funcionario.id}>
            <CardRegistro acoes={<AcoesFuncionario funcionario={funcionario} />}>
              <p className="font-medium text-texto-primario">{funcionario.nome}</p>
              <p className="text-sm text-texto-primario">{funcionario.cargo}</p>
              <p className="text-sm text-texto-secundario">
                Admissão {formatarData(funcionario.data_admissao)}
              </p>
              <p className="text-sm text-texto-secundario">
                {formatarTelefone(funcionario.telefone) || "Sem telefone"}
              </p>
              <span className="mt-1">
                <Badges funcionario={funcionario} />
              </span>
            </CardRegistro>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">Cargo</th>
              <th className="px-3 py-2 font-medium">Admissão</th>
              <th className="px-3 py-2 font-medium">Telefone</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {funcionarios.map((funcionario) => (
              <tr
                key={funcionario.id}
                className="border-b border-zinc-100 last:border-0"
              >
                <td className="px-3 py-2">{funcionario.nome}</td>
                <td className="px-3 py-2">{funcionario.cargo}</td>
                <td className="px-3 py-2">
                  {formatarData(funcionario.data_admissao)}
                </td>
                <td className="px-3 py-2">
                  {formatarTelefone(funcionario.telefone)}
                </td>
                <td className="px-3 py-2">
                  <Badges funcionario={funcionario} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-start gap-3">
                    <AcoesFuncionario funcionario={funcionario} />
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
