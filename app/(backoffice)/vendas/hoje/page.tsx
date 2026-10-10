import Link from "next/link";
import { SeletorPeriodo } from "@/components/seletor-periodo";
import {
  obterResumoVendasHoje,
  obterVendasHoje,
  totaisPagamento,
} from "@/lib/vendas-hoje";
import {
  formatarDataHora,
  formatarHora,
  formatarPreco,
} from "@/lib/format";
import { VENDAS_LISTA_LIMITE } from "@/lib/paginacao";
import { exigirAcesso } from "@/lib/permissoes";
import {
  ehPeriodoHoje,
  periodoVendasDaUrl,
  tituloVendasPeriodo,
} from "@/lib/periodo";
import { nomeExibicao } from "@/lib/visibilidade";
import { BadgeCategoriaPreco } from "../../badge-categoria-preco";
import { CupomVendaBadge } from "./cupom-venda-badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<{ de?: string; ate?: string; canceladas?: string }>;
};

export default async function VendasHojePage({ searchParams }: Props) {
  const logado = await exigirAcesso("vendas");
  const params = await searchParams;
  const periodo = periodoVendasDaUrl(params.de, params.ate);
  const mostrarCanceladas = params.canceladas === "1";
  const soHoje = ehPeriodoHoje(periodo.de, periodo.ate);
  const [resumo, vendas] = await Promise.all([
    obterResumoVendasHoje(periodo),
    obterVendasHoje(periodo, { incluirCanceladas: mostrarCanceladas }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para o dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {tituloVendasPeriodo(periodo.de, periodo.ate)}
        </h1>
      </div>

      <SeletorPeriodo
        key={`${periodo.de}-${periodo.ate}-${mostrarCanceladas ? "1" : "0"}`}
        rota="/vendas/hoje"
        de={periodo.de}
        ate={periodo.ate}
      >
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="canceladas"
            value="1"
            defaultChecked={mostrarCanceladas}
          />
          Mostrar canceladas
        </label>
      </SeletorPeriodo>

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
        <p className="text-sm text-zinc-600">
          {soHoje
            ? "Nenhuma venda finalizada hoje."
            : "Nenhuma venda finalizada neste período."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {vendas.length >= VENDAS_LISTA_LIMITE ? (
            <p className="text-sm text-texto-secundario">
              Mostrando as {VENDAS_LISTA_LIMITE} vendas mais recentes deste
              período. Abra a venda para ver os itens.
            </p>
          ) : null}
          {vendas.map((venda) => {
            const totais = totaisPagamento(
              venda.status === "cancelada"
                ? venda.venda_pagamento
                : venda.venda_pagamento.filter(
                    (pagamento) => pagamento.status === "confirmado",
                  ),
            );
            const formas = [
              ...new Set(
                venda.venda_pagamento.map(
                  (pagamento) => pagamento.forma_pagamento.nome,
                ),
              ),
            ];
            const horario = venda.finalizado_em
              ? soHoje
                ? formatarHora(venda.finalizado_em)
                : formatarDataHora(venda.finalizado_em)
              : "—";

            return (
              <article
                key={venda.id}
                className="rounded-lg border border-zinc-200 bg-white"
              >
                <Link
                  href={`/vendas/${venda.id}`}
                  className="block px-4 py-3 hover:bg-zinc-50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-zinc-900">
                        Venda #{venda.numero}
                        <span className="ml-2 font-normal text-zinc-500">
                          {horario}
                        </span>
                        {venda.status === "cancelada" ? (
                          <span className="ml-2 inline-flex rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                            Cancelada
                          </span>
                        ) : null}
                      </p>
                      <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
                        {venda.cliente?.nome ?? "Sem cliente"} ·{" "}
                        {nomeExibicao(venda.usuario, logado.perfil).nome} ·{" "}
                        {venda._count.venda_item}{" "}
                        {venda._count.venda_item === 1 ? "item" : "itens"}
                        <BadgeCategoriaPreco categoria={venda.tipo_preco} />
                      </p>
                      <p className="text-sm text-zinc-600">
                        {formas.length > 0 ? formas.join(", ") : "—"}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-x-3 text-right text-sm sm:gap-x-4">
                      <div>
                        <p className="text-zinc-500">Bruto</p>
                        <p className="font-data font-medium">
                          {formatarPreco(totais.bruto)}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Taxa</p>
                        <p className="font-data font-medium">
                          {formatarPreco(totais.taxa)}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Líquido</p>
                        <p className="font-data font-medium">
                          {formatarPreco(totais.liquido)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="px-4 pb-3">
                  <CupomVendaBadge
                    vendaId={venda.id}
                    tipoCupom={venda.tipo_cupom}
                    nfce={venda.nfce}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
