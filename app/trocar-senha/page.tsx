import { signOut } from "@/auth";
import { obterUsuarioSessao } from "@/lib/sessao";
import { TrocarSenhaForm } from "./trocar-senha-form";

export const dynamic = "force-dynamic";

export default async function TrocarSenhaPage() {
  const usuario = await obterUsuarioSessao();
  if (!usuario.senha_provisoria) {
    await signOut({ redirectTo: "/login" });
  }

  return (
    <main className="flex min-h-full items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-lg border border-borda bg-superficie p-6">
        <h1 className="text-xl font-semibold tracking-tight">Trocar senha</h1>
        <p className="mt-1 mb-6 text-sm text-texto-secundario">
          Obrigatório antes de usar o sistema
        </p>
        <TrocarSenhaForm />
      </div>
    </main>
  );
}
