import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BadgeCategoriaPreco } from "../../badge-categoria-preco";
import { CupomVendaBadge } from "../hoje/cupom-venda-badge";
import { formatarDataHora, formatarPreco } from "@/lib/format";
import { exigirAcesso } from "@/lib/permissoes";
import { rotuloCategoriaPreco } from "@/lib/cliente";
import { normalizarCategoriaPreco } from "@/lib/preco-categoria";
import {
  obterVendaDetalhe,
  rotuloStatusDocumentoFiscal,
  rotuloStatusVenda,
  totaisPagamento,
} from "@/lib/vendas-hoje";
import {
  comFlagPeso,
  itemVendidoPorPeso,
  rotuloPrecoUnitarioItem,
  rotuloQuantidadeItem,
} from "@/lib/venda-item";
import { nomeExibicao } from "@/lib/visibilidade";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ id: string }>;
};

function BadgeModoItem({
  pacote,
  peso,
}: {
  pacote: boolean;
  peso: boolean;
}) {
  if (!pacote && !peso) return null;
  return (
    <span className="inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
      {pacote ? "Pacote" : "Peso"}
    </span>
  );
}

function LinhaDado({
  rotulo,
  valor,
}: {
  rotulo: string;
  valor: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-texto-secundario">{rotulo}</dt>
      <dd className="mt-0.5 text-sm text-zinc-900">{valor}</dd>
    </div>
  );
}

function DocumentoFiscal({
  titulo,
  documento,
}: {
  titulo: string;
  documento: {
    status: string;
    mensagem_sefaz: string | null;
    danfe_url: string | null;
    numero: number | null;
  } | null;
}) {
  if (!documento) {
    return (
      <p className="text-sm text-texto-secundario">{titulo}: não emitida.</p>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      <p>
        <span className="text-texto-secundario">{titulo}: </span>
        {rotuloStatusDocumentoFiscal(documento.status)}
        {documento.numero != null ? ` · nº ${documento.numero}` : ""}
      </p>
      {documento.mensagem_sefaz ? (
        <p className="text-xs text-zinc-500">{documento.mensagem_sefaz}</p>
      ) : null}
      {documento.danfe_url ? (
        <a
          href={documento.danfe_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
        >
          Abrir DANFE
        </a>
      ) : null}
    </div>
  );
}

export default async function VendaDetalhePage({ params }: Props) {
  const logado = await exigirAcesso("vendas");
  const { id } = await params;
  const vendaId = Number(id);
  if (!Number.isInteger(vendaId) || vendaId <= 0) notFound();

  const venda = await obterVendaDetalhe(vendaId);
  if (!venda) notFound();

  const totais = totaisPagamento(
    venda.venda_pagamento.filter((pagamento) => pagamento.status === "confirmado"),
  );
  const dataHora = venda.finalizado_em ?? venda.criado_em;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/vendas/hoje" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para vendas
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Venda #{venda.numero}
        </h1>
        <p className="mt-1 text-sm text-texto-secundario">
          {formatarDataHora(dataHora)}
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
        <h2 className="text-sm font-medium text-zinc-900">Dados da venda</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <LinhaDado rotulo="Data e hora" valor={formatarDataHora(dataHora)} />
          <LinhaDado
            rotulo="Cliente"
            valor={venda.cliente?.nome ?? "Sem cliente"}
          />
          <LinhaDado
            rotulo="Operador"
            valor={nomeExibicao(venda.usuario, logado.perfil).nome}
          />
          <LinhaDado rotulo="Status" valor={rotuloStatusVenda(venda.status)} />
          <LinhaDado
            rotulo="Categoria de preço"
            valor={
              <span className="inline-flex items-center gap-2">
                {rotuloCategoriaPreco(normalizarCategoriaPreco(venda.tipo_preco))}
                <BadgeCategoriaPreco categoria={venda.tipo_preco} />
              </span>
            }
          />
          <LinhaDado
            rotulo="Total"
            valor={
              <span className="font-data">{formatarPreco(venda.total)}</span>
            }
          />
        </dl>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
        <h2 className="text-sm font-medium text-zinc-900">Itens</h2>
        {venda.venda_item.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">Nenhum item nesta venda.</p>
        ) : (
          <>
            <ul className="mt-3 flex flex-col gap-3 md:hidden">
              {venda.venda_item.map((item) => {
                const exibicao = comFlagPeso(item);
                return (
                  <li
                    key={item.id}
                    className="rounded border border-zinc-100 px-3 py-2 text-sm"
                  >
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {item.produto.nome}
                      <BadgeModoItem
                        pacote={item.vendido_em_pacote}
                        peso={itemVendidoPorPeso(exibicao)}
                      />
                      <BadgeCategoriaPreco categoria={item.tipo_preco_aplicado} />
                    </p>
                    <p className="mt-1 font-data text-texto-secundario">
                      {rotuloQuantidadeItem(exibicao)} ·{" "}
                      {rotuloPrecoUnitarioItem(exibicao)} ·{" "}
                      {formatarPreco(item.subtotal)}
                    </p>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="text-zinc-600">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Produto</th>
                    <th className="py-1 pr-3 font-medium">Modo</th>
                    <th className="py-1 pr-3 font-medium">Categoria</th>
                    <th className="py-1 pr-3 font-medium">Qtd</th>
                    <th className="py-1 pr-3 font-medium">Preço unit.</th>
                    <th className="py-1 font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {venda.venda_item.map((item) => {
                    const exibicao = comFlagPeso(item);
                    return (
                      <tr key={item.id} className="border-t border-zinc-100">
                        <td className="py-1.5 pr-3">{item.produto.nome}</td>
                        <td className="py-1.5 pr-3">
                          <BadgeModoItem
                            pacote={item.vendido_em_pacote}
                            peso={itemVendidoPorPeso(exibicao)}
                          />
                        </td>
                        <td className="py-1.5 pr-3">
                          <BadgeCategoriaPreco
                            categoria={item.tipo_preco_aplicado}
                          />
                        </td>
                        <td className="py-1.5 pr-3 font-data">
                          {rotuloQuantidadeItem(exibicao)}
                        </td>
                        <td className="py-1.5 pr-3 font-data">
                          {item.vendido_em_pacote && item.preco_pacote_aplicado != null
                            ? `${formatarPreco(item.preco_unitario)} · ${formatarPreco(item.preco_pacote_aplicado)} / pacote`
                            : rotuloPrecoUnitarioItem(exibicao)}
                        </td>
                        <td className="py-1.5 font-data">
                          {formatarPreco(item.subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
        <h2 className="text-sm font-medium text-zinc-900">Pagamentos</h2>
        {venda.venda_pagamento.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">
            Nenhum pagamento registrado.
          </p>
        ) : (
          <>
            <ul className="mt-3 flex flex-col gap-3 md:hidden">
              {venda.venda_pagamento.map((pagamento) => (
                <li
                  key={pagamento.id}
                  className="rounded border border-zinc-100 px-3 py-2 text-sm"
                >
                  <p className="font-medium">{pagamento.forma_pagamento.nome}</p>
                  <p className="mt-1 font-data text-texto-secundario">
                    {pagamento.numero_parcelas}x · bruto{" "}
                    {formatarPreco(pagamento.valor)} · taxa{" "}
                    {formatarPreco(pagamento.valor_taxa)} (
                    {Number(pagamento.taxa_percentual_aplicada)}%) · líquido{" "}
                    {formatarPreco(pagamento.valor_liquido)}
                    {Number(pagamento.troco ?? 0) > 0
                      ? ` · troco ${formatarPreco(pagamento.troco)}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-3 hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="text-zinc-600">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Forma</th>
                    <th className="py-1 pr-3 font-medium">Parcelas</th>
                    <th className="py-1 pr-3 font-medium">Bruto</th>
                    <th className="py-1 pr-3 font-medium">Taxa</th>
                    <th className="py-1 pr-3 font-medium">Líquido</th>
                    <th className="py-1 font-medium">Troco</th>
                  </tr>
                </thead>
                <tbody>
                  {venda.venda_pagamento.map((pagamento) => (
                    <tr key={pagamento.id} className="border-t border-zinc-100">
                      <td className="py-1.5 pr-3">
                        {pagamento.forma_pagamento.nome}
                      </td>
                      <td className="py-1.5 pr-3 font-data">
                        {pagamento.numero_parcelas}x
                      </td>
                      <td className="py-1.5 pr-3 font-data">
                        {formatarPreco(pagamento.valor)}
                      </td>
                      <td className="py-1.5 pr-3 font-data">
                        {formatarPreco(pagamento.valor_taxa)}{" "}
                        <span className="text-texto-secundario">
                          ({Number(pagamento.taxa_percentual_aplicada)}%)
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 font-data">
                        {formatarPreco(pagamento.valor_liquido)}
                      </td>
                      <td className="py-1.5 font-data">
                        {formatarPreco(pagamento.troco)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-xs text-texto-secundario">Bruto</dt>
                <dd className="font-data font-medium">
                  {formatarPreco(totais.bruto)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-texto-secundario">Taxa</dt>
                <dd className="font-data font-medium">
                  {formatarPreco(totais.taxa)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-texto-secundario">Líquido</dt>
                <dd className="font-data font-medium">
                  {formatarPreco(totais.liquido)}
                </dd>
              </div>
            </dl>
          </>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
        <h2 className="text-sm font-medium text-zinc-900">Cupom e notas</h2>
        <div className="mt-3 flex flex-col gap-3">
          <Link
            href={`/vendas/${venda.id}/cupom`}
            className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
          >
            Ver/imprimir cupom
          </Link>
          <CupomVendaBadge
            vendaId={venda.id}
            tipoCupom={venda.tipo_cupom}
            nfce={venda.nfce}
          />
          <DocumentoFiscal titulo="NFC-e" documento={venda.nfce} />
          <DocumentoFiscal titulo="NF-e" documento={venda.nfe} />
          {venda.tipo_cupom === "nfe" ? (
            <Link
              href="/notas-fiscais"
              className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
            >
              Ver notas fiscais
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
