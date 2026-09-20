import Link from "next/link";
import { exigirAcesso } from "@/lib/permissoes";
import { NovaContagemForm } from "./form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NovaContagemPage() {
  await exigirAcesso("relatorios");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/relatorios/inventario"
          className="text-sm text-zinc-600 hover:underline"
        >
          ← Voltar para inventário
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nova contagem
        </h1>
      </div>
      <NovaContagemForm />
    </div>
  );
}
