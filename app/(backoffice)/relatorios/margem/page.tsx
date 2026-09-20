import Link from "next/link";
import { exigirAcesso } from "@/lib/permissoes";
import { obterMargemPorProduto } from "@/lib/relatorios";
import { MargemTabela } from "./margem-tabela";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MargemPorProdutoPage() {
  await exigirAcesso("relatorios");
  const linhas = await obterMargemPorProduto();

  return (
    <div className="flex flex-col gap-6">
      <style>{`@media print { @page { size: A4; margin: 12mm; } }`}</style>
      <div className="print-ocultar">
        <Link href="/relatorios" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para relatórios
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Margem por produto
        </h1>
        <p className="mt-1 text-sm text-texto-secundario">
          Custo médio, preço de venda e margem dos produtos finais e de
          revenda. Ordenado da margem mais apertada para a mais folgada.
        </p>
      </div>

      <MargemTabela linhas={linhas} />
    </div>
  );
}
