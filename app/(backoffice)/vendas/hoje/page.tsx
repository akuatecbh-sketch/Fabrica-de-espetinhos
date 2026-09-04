import Link from "next/link";
import {
  obterResumoVendasHoje,
  obterVendasHoje,
  totaisPagamento,
} from "@/lib/vendas-hoje";
import {
  formatarHora,
  formatarPreco,
  formatarQuantidade,
} from "@/lib/format";
import { obterUsuarioSessao } from "@/lib/sessao";
import { linhaItemVenda, rotuloQuantidadeItem } from "@/lib/venda-item";
import { nomeExibicao } from "@/lib/visibilidade";
import { CupomVendaBadge } from "./cupom-venda-badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VendasHojePage() {
  const [resumo, vendas, logado] = await Promise.all([
    obterResumoVendasHoje(),
    obterVendasHoje(),
    obterUsuarioSessao(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para o dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Vendas de hoje
        </h1>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded border border-zinc-200 bg-white px-4 py-3">
          <dt className="text-xs text-texto-secundario">Vendas finalizadas</dt>
          <dd className="font-data text-lg font-medium">{resumo.quantidade}</dd>
        </div>
        <div className="rounded border border-zinc-200 bg-white px-4 py-3">
          <dt className="text-xs text-texto-secundario">Faturamento bruto</dt>
          <dd className="font-data text-lg font-medium">
            {formatarPreco(resumo.faturamentoBruto)}
          </dd>
        </div>
        <div className="rounded border border-zinc-200 bg-white px-4 py-3">
          <dt className="text-xs text-texto-secundario">Faturamento líquido</dt>
          <dd className="font-data text-lg font-medium">
            {formatarPreco(resumo.faturamentoLiquido)}
          </dd>
        </div>
      </dl>

      {vendas.length === 0 ? (
        <p className="text-sm text-zinc-600">Nenhuma venda finalizada hoje.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {vendas.map((venda) => {
            const totais = totaisPagamento(venda.venda_pagamento);
            const formas = [
              ...new Set(
                venda.venda_pagamento.map(
                  (pagamento) => pagamento.forma_pagamento.nome,
                ),
              ),
            ];

            return (
              <article
                key={venda.id}
                className="rounded-lg border border-zinc-200 bg-white"
              >
                <div className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-zinc-900">
                        Venda #{venda.numero}
                        <span className="ml-2 font-normal text-zinc-500">
                          {venda.finalizado_em
                            ? formatarHora(venda.finalizado_em)
                            : "—"}
                        </span>
                      </p>
                      <p className="text-sm text-zinc-600">
                        {venda.cliente?.nome ?? "Sem cliente"} ·{" "}
                        {nomeExibicao(venda.usuario, logado.perfil).nome} ·{" "}
                        {venda.venda_item.length}{" "}
                        {venda.venda_item.length === 1 ? "item" : "itens"}
                      </p>
                      <p className="text-sm text-zinc-600">
                        {formas.length > 0 ? formas.join(", ") : "—"}
                      </p>
                      <CupomVendaBadge
                        vendaId={venda.id}
                        tipoCupom={venda.tipo_cupom}
                        nfce={venda.nfce}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-x-3 text-right text-sm sm:gap-x-4">
                      <div>
                        <p className="text-zinc-500">Bruto</p>
                        <p className="font-data font-medium">{formatarPreco(totais.bruto)}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Taxa</p>
                        <p className="font-data font-medium">{formatarPreco(totais.taxa)}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Líquido</p>
                        <p className="font-data font-medium">{formatarPreco(totais.liquido)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <details>
                  <summary className="cursor-pointer list-none border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 marker:content-none hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
                    Clique para ver os itens
                  </summary>
                  <div className="border-t border-zinc-200 px-4 py-3">
                  {venda.venda_item.length === 0 ? (
                    <p className="text-sm text-zinc-600">Nenhum item nesta venda.</p>
                  ) : (
                    <>
                      <ul className="flex flex-col gap-2 md:hidden">
                        {venda.venda_item.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start justify-between gap-3 text-sm"
                          >
                            <span className="min-w-0 break-words">
                              {item.vendido_em_pacote
                                ? linhaItemVenda(item.produto.nome, item)
                                : item.produto.nome}
                            </span>
                            {item.vendido_em_pacote ? null : (
                              <span className="font-data shrink-0 text-texto-secundario">
                                {formatarQuantidade(item.quantidade)} ×{" "}
                                {formatarPreco(item.preco_unitario)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <table className="hidden min-w-full text-left text-sm md:table">
                      <thead className="text-zinc-600">
                        <tr>
                          <th className="py-1 pr-3 font-medium">Produto</th>
                          <th className="py-1 pr-3 font-medium">Qtd</th>
                          <th className="py-1 pr-3 font-medium">Preço unit.</th>
                          <th className="py-1 font-medium">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {venda.venda_item.map((item) => (
                          <tr key={item.id} className="border-t border-zinc-100">
                            <td className="py-1.5 pr-3">
                              {item.vendido_em_pacote
                                ? linhaItemVenda(item.produto.nome, item)
                                : item.produto.nome}
                            </td>
                            <td className="py-1.5 pr-3 font-data">
                              {rotuloQuantidadeItem(item)}
                            </td>
                            <td className="py-1.5 pr-3 font-data">
                              {item.vendido_em_pacote
                                ? "—"
                                : formatarPreco(item.preco_unitario)}
                            </td>
                            <td className="py-1.5 font-data">
                              {formatarPreco(item.subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </>
                  )}
                </div>
                </details>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
