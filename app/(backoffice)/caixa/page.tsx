import Link from "next/link";
import { obterCaixaAberto } from "@/lib/caixa";
import { formatarDataHora, formatarPreco } from "@/lib/format";
import { obterResumoCaixa } from "@/lib/resumo-caixa";
import { prisma } from "@/lib/prisma";
import { obterUsuarioSessao } from "@/lib/sessao";
import {
  SELECT_USUARIO_RELACAO,
  nomeExibicao,
} from "@/lib/visibilidade";
import { AbrirCaixaForm } from "./abrir-form";
import { FecharCaixaForm } from "./fechar-form";

export const dynamic = "force-dynamic";

export default async function CaixaPage() {
  const [caixaAberto, logado] = await Promise.all([
    obterCaixaAberto(),
    obterUsuarioSessao(),
  ]);

  if (!caixaAberto) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Abrir caixa</h1>
        <p className="text-sm text-zinc-600">
          Não há caixa aberto. Informe o fundo de troco para iniciar o PDV.
        </p>
        <AbrirCaixaForm />
      </div>
    );
  }

  const [resumo, vendasPendentes, operadorAbertura, movimentacoes] =
    await Promise.all([
      obterResumoCaixa(caixaAberto.id, caixaAberto.valor_abertura),
      prisma.venda.count({
        where: { status: { in: ["aberta", "em_espera"] } },
      }),
      prisma.usuario.findUnique({
        where: { id: caixaAberto.usuario_abertura_id },
        select: SELECT_USUARIO_RELACAO,
      }),
      prisma.movimentacao_caixa.findMany({
        where: { caixa_id: caixaAberto.id },
        include: {
          usuario: { select: SELECT_USUARIO_RELACAO },
        },
        orderBy: { criado_em: "desc" },
        take: 20,
      }),
    ]);

  const abertoPor = nomeExibicao(operadorAbertura, logado.perfil).nome;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Caixa</h1>
            <span className="inline-flex rounded-full bg-gradiente-brasa px-2 py-0.5 text-xs font-medium text-white pulso-brasa">
              Caixa aberto
            </span>
          </div>
          <p className="text-sm text-texto-secundario">
            Aberto por {abertoPor} desde{" "}
            {formatarDataHora(caixaAberto.data_abertura)} — valor de abertura:{" "}
            <span className="font-data text-texto-primario">
              {formatarPreco(caixaAberto.valor_abertura)}
            </span>
          </p>
        </div>
        <Link
          href="/pdv"
          className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
        >
          Ir para o PDV
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Resumo do caixa</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded border border-zinc-200 bg-white px-3 py-2">
            <dt className="text-xs text-texto-secundario">Faturamento bruto</dt>
            <dd className="font-data text-sm font-medium">
              {formatarPreco(resumo.faturamento_bruto)}
            </dd>
          </div>
          <div className="rounded border border-zinc-200 bg-white px-3 py-2">
            <dt className="text-xs text-texto-secundario">Total de taxas</dt>
            <dd className="font-data text-sm font-medium">
              {formatarPreco(resumo.total_taxas)}
            </dd>
          </div>
          <div className="rounded border border-zinc-200 bg-white px-3 py-2">
            <dt className="text-xs text-texto-secundario">Faturamento líquido</dt>
            <dd className="font-data text-sm font-medium">
              {formatarPreco(resumo.faturamento_liquido)}
            </dd>
          </div>
        </dl>

        <ul className="flex flex-col gap-2 md:hidden">
          {resumo.formas.map((forma) => (
            <li
              key={forma.forma_pagamento}
              className="rounded-lg border border-borda bg-superficie p-3"
            >
              <p className="font-medium">{forma.forma_pagamento}</p>
              <p className="font-data text-sm text-texto-primario">
                {formatarPreco(forma.valor_bruto)}
              </p>
              <p className="text-xs text-texto-secundario">
                Taxa {formatarPreco(forma.valor_taxa)} · Líquido{" "}
                {formatarPreco(forma.valor_liquido)}
              </p>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-3 py-2 font-medium">Forma</th>
                <th className="px-3 py-2 font-medium">Valor bruto</th>
                <th className="px-3 py-2 font-medium">Taxa</th>
                <th className="px-3 py-2 font-medium">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {resumo.formas.map((forma) => (
                <tr
                  key={forma.forma_pagamento}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="px-3 py-2">{forma.forma_pagamento}</td>
                  <td className="px-3 py-2 font-data">
                    {formatarPreco(forma.valor_bruto)}
                  </td>
                  <td className="px-3 py-2 font-data">
                    {formatarPreco(forma.valor_taxa)}
                  </td>
                  <td className="px-3 py-2 font-data">
                    {formatarPreco(forma.valor_liquido)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {movimentacoes.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Movimentações</h2>
          <ul className="flex flex-col gap-2 md:hidden">
            {movimentacoes.map((movimento) => (
              <li
                key={movimento.id}
                className="rounded-lg border border-borda bg-superficie p-3"
              >
                <p className="font-medium">{movimento.tipo}</p>
                <p className="font-data text-sm text-texto-primario">
                  {formatarPreco(movimento.valor)}
                </p>
                <p className="text-xs text-texto-secundario">
                  {formatarDataHora(movimento.criado_em)} ·{" "}
                  {nomeExibicao(movimento.usuario, logado.perfil).nome}
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Valor</th>
                  <th className="px-3 py-2 font-medium">Usuário</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.map((movimento) => (
                  <tr
                    key={movimento.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatarDataHora(movimento.criado_em)}
                    </td>
                    <td className="px-3 py-2">{movimento.tipo}</td>
                    <td className="px-3 py-2 font-data">
                      {formatarPreco(movimento.valor)}
                    </td>
                    <td className="px-3 py-2">
                      {nomeExibicao(movimento.usuario, logado.perfil).nome}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Fechamento</h2>
        <p className="text-sm text-zinc-600">
          Cartão e Pix não entram no caixa físico. O valor do sistema é a
          abertura somada apenas às vendas em dinheiro.
        </p>
        <FecharCaixaForm
          caixaId={caixaAberto.id}
          valorSistema={resumo.valor_fechamento_sistema}
          vendasPendentes={vendasPendentes}
        />
      </section>
    </div>
  );
}
