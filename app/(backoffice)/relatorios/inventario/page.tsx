import Link from "next/link";
import { exigirAcesso } from "@/lib/permissoes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InventarioPage() {
  await exigirAcesso("relatorios");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/relatorios" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para relatórios
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Inventário físico
        </h1>
        <p className="mt-1 text-sm text-texto-secundario">
          A contagem física fica disponível nesta rota. Em breve você
          poderá abrir um inventário, conferir os saldos e registrar as
          diferenças.
        </p>
      </div>
    </div>
  );
}
