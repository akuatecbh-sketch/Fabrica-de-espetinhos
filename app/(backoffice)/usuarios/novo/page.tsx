import Link from "next/link";
import { perfisQuePodeAtribuir } from "@/lib/acesso";
import { exigirAcesso } from "@/lib/permissoes";
import { criarUsuario } from "../actions";
import { UsuarioForm } from "../usuario-form";

export const dynamic = "force-dynamic";

export default async function NovoUsuarioPage() {
  const logado = await exigirAcesso("usuarios");
  const perfis = perfisQuePodeAtribuir(logado.perfil);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/usuarios" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para usuários
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Novo usuário
        </h1>
      </div>
      <UsuarioForm
        action={criarUsuario}
        perfis={perfis}
        submitLabel="Cadastrar"
        criar
      />
    </div>
  );
}
