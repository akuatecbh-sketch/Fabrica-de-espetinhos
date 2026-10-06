import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatarDataHora, formatarPreco } from "@/lib/format";
import { obterCaixaAberto } from "@/lib/caixa";
import { listarDevolvivel } from "@/lib/cancelar-venda";
import { arredondarDinheiro } from "@/lib/dinheiro";
import { exigirAcesso, temAcesso } from "@/lib/permissoes";
import {
  notaFiscalBloqueiaCancelamento,
  obterVendaDetalhe,
} from "@/lib/vendas-hoje";
import { CancelarVendaForm } from "./cancelar-venda-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ id: string }>;
};

function formatarDiaMes(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(data);
}

export default async function CancelarVendaPage({ params }: Props) {
  const usuario = await exigirAcesso("vendas");
  if (!(await temAcesso(usuario.id, "cancelar_venda"))) {
    redirect("/acesso-negado");
  }

  const { id } = await params;
  const vendaId = Number(id);
  if (!Number.isInteger(vendaId) || vendaId <= 0) notFound();

  const [venda, devolviveis, caixaAberto] = await Promise.all([
    obterVendaDetalhe(vendaId),
    listarDevolvivel(vendaId),
    obterCaixaAberto(),
  ]);
  if (!venda) notFound();
  if (venda.status !== "finalizada") {
    redirect(`/vendas/${venda.id}`);
  }

  const notaBloqueada =
    notaFiscalBloqueiaCancelamento(venda.nfce?.status) ||
    notaFiscalBloqueiaCancelamento(venda.nfe?.status);
  const caixaFechado =
    venda.caixa != null && venda.caixa.status === "fechado";
  const pagamentosDinheiro = venda.venda_pagamento.filter(
    (pagamento) => pagamento.forma_pagamento.tipo === "dinheiro",
  );
  const valorDinheiro = arredondarDinheiro(
    pagamentosDinheiro.reduce((soma, pagamento) => {
      return soma + Number(pagamento.valor) - Number(pagamento.troco ?? 0);
    }, 0),
  );
  const dataHora = venda.finalizado_em ?? venda.criado_em;
  const formas = [
    ...new Set(
      venda.venda_pagamento.map((pagamento) => pagamento.forma_pagamento.nome),
    ),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/vendas/${venda.id}`}
          className="text-sm text-zinc-600 hover:underline"
        >
          ← Voltar para a venda #{venda.numero}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Cancelar venda #{venda.numero}
        </h1>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
        <h2 className="text-sm font-medium text-zinc-900">Resumo da venda</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-texto-secundario">Número</dt>
            <dd className="text-sm">#{venda.numero}</dd>
          </div>
          <div>
            <dt className="text-xs text-texto-secundario">Data</dt>
            <dd className="text-sm">{formatarDataHora(dataHora)}</dd>
          </div>
          <div>
            <dt className="text-xs text-texto-secundario">Cliente</dt>
            <dd className="text-sm">{venda.cliente?.nome ?? "Sem cliente"}</dd>
          </div>
          <div>
            <dt className="text-xs text-texto-secundario">Total</dt>
            <dd className="font-data text-sm">{formatarPreco(venda.total)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-texto-secundario">Pagamentos</dt>
            <dd className="text-sm">
              {formas.length > 0 ? formas.join(", ") : "—"}
            </dd>
          </div>
        </dl>
      </section>

      {caixaFechado && venda.caixa ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Esta venda é do caixa #{venda.caixa.id}, fechado em{" "}
          {venda.caixa.data_fechamento
            ? formatarDiaMes(venda.caixa.data_fechamento)
            : "—"}.{" "}
          O fechamento dele não será alterado; o estorno em dinheiro entra no
          caixa atual.
        </p>
      ) : null}

      {notaBloqueada ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Venda com nota fiscal autorizada. Fale com o contador antes de
          cancelar.
        </p>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
        <CancelarVendaForm
          vendaId={venda.id}
          numero={venda.numero}
          total={Number(venda.total)}
          itens={devolviveis}
          valorDinheiro={valorDinheiro}
          temCaixaAberto={caixaAberto != null}
          notaBloqueada={notaBloqueada}
        />
      </section>
    </div>
  );
}
