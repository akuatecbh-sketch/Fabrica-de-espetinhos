import Link from "next/link";
import { formatarCnpjCpf, formatarTelefone } from "@/lib/documento";
import { CardRegistro } from "../card-registro";
import { InativarFornecedorButton } from "./inativar-button";

type FornecedorLista = {
  id: number;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj_cpf: string;
  telefone: string | null;
  ativo: boolean;
};

function AcoesFornecedor({ fornecedor }: { fornecedor: FornecedorLista }) {
  return (
    <>
      <Link
        href={`/fornecedores/${fornecedor.id}/editar`}
        className="inline-flex min-h-11 items-center text-texto-primario underline-offset-2 hover:underline md:min-h-0"
      >
        Editar
      </Link>
      {fornecedor.ativo ? (
        <InativarFornecedorButton
          id={fornecedor.id}
          nome={fornecedor.nome_fantasia || fornecedor.razao_social}
        />
      ) : null}
    </>
  );
}

export function ListaFornecedores({
  fornecedores,
  vazio,
}: {
  fornecedores: FornecedorLista[];
  vazio: string;
}) {
  if (fornecedores.length === 0) {
    return <p className="text-sm text-texto-secundario">{vazio}</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {fornecedores.map((fornecedor) => (
          <li key={fornecedor.id}>
            <CardRegistro acoes={<AcoesFornecedor fornecedor={fornecedor} />}>
              <p className="font-medium text-texto-primario">
                {fornecedor.razao_social}
              </p>
              <p className="text-sm text-texto-secundario">
                {fornecedor.nome_fantasia || "Sem nome fantasia"}
              </p>
              <p className="font-data text-sm text-texto-primario">
                {formatarCnpjCpf(fornecedor.cnpj_cpf)}
              </p>
              <p className="text-xs text-texto-secundario">
                {formatarTelefone(fornecedor.telefone) || "Sem telefone"}
              </p>
              {fornecedor.ativo ? (
                <span className="mt-1 w-fit rounded bg-verde-sucesso/10 px-2 py-0.5 text-xs font-medium text-verde-sucesso">
                  Ativo
                </span>
              ) : (
                <span className="mt-1 text-xs text-texto-secundario">Inativo</span>
              )}
            </CardRegistro>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 font-medium">Razão social</th>
              <th className="px-3 py-2 font-medium">Nome fantasia</th>
              <th className="px-3 py-2 font-medium">CNPJ/CPF</th>
              <th className="px-3 py-2 font-medium">Telefone</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {fornecedores.map((fornecedor) => (
              <tr
                key={fornecedor.id}
                className="border-b border-zinc-100 last:border-0"
              >
                <td className="px-3 py-2">{fornecedor.razao_social}</td>
                <td className="px-3 py-2">{fornecedor.nome_fantasia || "—"}</td>
                <td className="px-3 py-2 font-mono">
                  {formatarCnpjCpf(fornecedor.cnpj_cpf)}
                </td>
                <td className="px-3 py-2">
                  {formatarTelefone(fornecedor.telefone)}
                </td>
                <td className="px-3 py-2">
                  {fornecedor.ativo ? (
                    <span className="rounded bg-verde-sucesso/10 px-2 py-0.5 text-xs font-medium text-verde-sucesso">
                      Ativo
                    </span>
                  ) : (
                    <span className="text-texto-secundario">Inativo</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-3">
                    <AcoesFornecedor fornecedor={fornecedor} />
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
