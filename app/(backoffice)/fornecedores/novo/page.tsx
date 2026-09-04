import Link from "next/link";
import { criarFornecedor } from "../actions";
import { FornecedorForm } from "../fornecedor-form";

export const dynamic = "force-dynamic";

export default function NovoFornecedorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/fornecedores"
          className="text-sm text-zinc-600 hover:underline"
        >
          ← Voltar para fornecedores
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Novo fornecedor
        </h1>
      </div>
      <FornecedorForm action={criarFornecedor} submitLabel="Cadastrar" />
    </div>
  );
}
