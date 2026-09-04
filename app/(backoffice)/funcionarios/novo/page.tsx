import Link from "next/link";
import { exigirAcesso } from "@/lib/permissoes";
import { criarFuncionario, listarUsuariosDisponiveis } from "../actions";
import { FuncionarioForm } from "../funcionario-form";

export const dynamic = "force-dynamic";

export default async function NovoFuncionarioPage() {
  const logado = await exigirAcesso("funcionarios");
  const usuarios = await listarUsuariosDisponiveis();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/funcionarios"
          className="text-sm text-zinc-600 hover:underline"
        >
          ← Voltar para funcionários
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Novo funcionário
        </h1>
      </div>
      <FuncionarioForm
        action={criarFuncionario}
        usuarios={usuarios}
        perfilDeQuemVeVe={logado.perfil}
        submitLabel="Cadastrar"
      />
    </div>
  );
}
