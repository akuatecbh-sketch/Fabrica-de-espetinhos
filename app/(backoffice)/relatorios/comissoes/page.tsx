import Link from "next/link";
import { exigirAcesso } from "@/lib/permissoes";
import {
  obterRelatorioComissoes,
  periodoComissaoDaUrl,
} from "@/lib/comissoes";
import { ComissoesTabela } from "./comissoes-tabela";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<{ de?: string; ate?: string }>;
};

export default async function ComissoesPage({ searchParams }: Props) {
  await exigirAcesso("relatorios");
  const params = await searchParams;
  const periodo = periodoComissaoDaUrl(params.de, params.ate);
  const dados = await obterRelatorioComissoes(periodo.de, periodo.ate);

  return (
    <div className="flex flex-col gap-6">
      <style>{`@media print { @page { size: A4; margin: 12mm; } }`}</style>
      <div className="print-ocultar">
        <Link href="/relatorios" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para relatórios
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Comissões
        </h1>
        <p className="mt-1 text-sm text-texto-secundario">
          Comissão sobre o faturamento líquido das vendas finalizadas no
          período, para funcionários com percentual definido e usuário vinculado.
        </p>
      </div>

      <form
        method="get"
        className="print-ocultar flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <label className="flex flex-col gap-1 text-sm">
          De
          <input
            type="date"
            name="de"
            defaultValue={periodo.de}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          até
          <input
            type="date"
            name="ate"
            defaultValue={periodo.ate}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Filtrar
        </button>
      </form>

      <ComissoesTabela dados={dados} />
    </div>
  );
}
