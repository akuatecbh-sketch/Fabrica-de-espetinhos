import Link from "next/link";
import { exigirAcesso } from "@/lib/permissoes";
import { dataLocalISO } from "@/lib/financeiro";
import { listarProdutosFinaisParaProduzir } from "@/lib/producao";
import { ProducaoForm } from "./producao-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<{ produto?: string; quantidade?: string }>;
};

export default async function NovaProducaoPage({ searchParams }: Props) {
  await exigirAcesso("producao");
  const params = await searchParams;
  const produtoId = Number(params.produto);
  const quantidade = Number(String(params.quantidade ?? "").replace(",", "."));
  const produtos = await listarProdutosFinaisParaProduzir();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/producao"
          className="text-sm text-zinc-600 hover:underline"
        >
          ← Voltar para produção
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nova produção
        </h1>
        <p className="mt-1 text-sm text-texto-secundario">
          Confira a prévia dos insumos antes de confirmar. A baixa e a entrada
          acontecem na mesma transação.
        </p>
      </div>

      <ProducaoForm
        produtos={produtos}
        produtoIdInicial={
          Number.isInteger(produtoId) && produtoId > 0 ? produtoId : null
        }
        quantidadeInicial={
          Number.isFinite(quantidade) && quantidade > 0
            ? String(quantidade)
            : ""
        }
        dataInicial={dataLocalISO()}
      />
    </div>
  );
}
