import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatarData, formatarPreco, formatarQuantidade } from "@/lib/format";
import { exigirAcesso, temAcesso } from "@/lib/permissoes";
import { calcularPreviaCancelamento } from "@/lib/producao";
import { CancelarProducaoForm } from "./cancelar-producao-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CancelarProducaoPage({ params }: Props) {
  const usuario = await exigirAcesso("producao");
  if (!(await temAcesso(usuario.id, "cancelar_producao"))) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const producaoId = Number(id);
  if (!Number.isInteger(producaoId) || producaoId <= 0) notFound();

  const previa = await calcularPreviaCancelamento(producaoId);
  if (!previa) notFound();
  if (previa.jaCancelada) {
    redirect(`/producao/${producaoId}`);
  }

  const { producao, plano } = previa;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/producao/${producao.id}`}
          className="text-sm text-zinc-600 hover:underline"
        >
          ← Voltar para a produção #{producao.id}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Cancelar produção #{producao.id}
        </h1>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
        <h2 className="text-sm font-medium text-zinc-900">Resumo</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-texto-secundario">Produto</dt>
            <dd className="text-sm">{producao.produto.nome}</dd>
          </div>
          <div>
            <dt className="text-xs text-texto-secundario">Quantidade</dt>
            <dd className="font-data text-sm">
              {formatarQuantidade(producao.quantidade)}{" "}
              {producao.produto.unidade_medida.sigla}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-texto-secundario">Data</dt>
            <dd className="font-data text-sm">{formatarData(producao.data)}</dd>
          </div>
          <div>
            <dt className="text-xs text-texto-secundario">Custo dos insumos</dt>
            <dd className="font-data text-sm">
              {formatarPreco(producao.custo_total)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
        <h2 className="text-sm font-medium text-zinc-900">
          O que volta ao estoque
        </h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {plano.linhas.map((linha) => (
            <li key={linha.insumoId}>
              {linha.nome}: devolve {formatarQuantidade(linha.quantidade)}{" "}
              {linha.unidade}
              {!linha.controlaEstoque ? (
                <span className="ml-2 text-texto-secundario">
                  (não controlado — sem movimentação)
                </span>
              ) : (
                <span className="ml-2 font-data text-texto-secundario">
                  {formatarQuantidade(linha.saldoAtual)} →{" "}
                  {formatarQuantidade(linha.saldoDepois)}
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          Produto final {plano.produtoFinal.nome}: retira{" "}
          {formatarQuantidade(plano.produtoFinal.quantidade)}{" "}
          {plano.produtoFinal.unidade}
          {plano.produtoFinal.controlaEstoque ? (
            <span className="ml-2 font-data text-texto-secundario">
              {formatarQuantidade(plano.produtoFinal.saldoAtual)} →{" "}
              {formatarQuantidade(plano.produtoFinal.saldoDepois)}
            </span>
          ) : (
            <span className="ml-2 text-texto-secundario">
              (não controlado — sem movimentação)
            </span>
          )}
        </p>
      </section>

      <CancelarProducaoForm
        producaoId={producao.id}
        temSaldoNegativoProduto={plano.temSaldoNegativoProduto}
      />
    </div>
  );
}
