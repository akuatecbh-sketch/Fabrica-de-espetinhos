import Link from "next/link";
import { exigirAcesso } from "@/lib/permissoes";
import { criarCliente } from "../actions";
import { ClienteForm } from "../cliente-form";

export const dynamic = "force-dynamic";

export default async function NovoClientePage() {
  await exigirAcesso("clientes");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/clientes" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para clientes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Novo cliente
        </h1>
      </div>
      <ClienteForm action={criarCliente} submitLabel="Cadastrar" />
    </div>
  );
}
