import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  formatarDataHora,
  formatarPreco,
} from "@/lib/format";
import { formatarCnpjCpf } from "@/lib/documento";
import { exigirPdvOuVendas } from "@/lib/sessao";
import { linhaItemVenda, rotuloQuantidadeItem } from "@/lib/venda-item";
import { ImprimirCupomButton } from "./imprimir-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CupomNaoFiscalPage({ params }: Props) {
  await exigirPdvOuVendas();
  const { id } = await params;
  const vendaId = Number(id);
  if (!Number.isInteger(vendaId)) notFound();

  const [venda, empresa] = await Promise.all([
    prisma.venda.findUnique({
      where: { id: vendaId },
      include: {
        cliente: { select: { nome: true } },
        venda_item: {
          include: { produto: { select: { nome: true } } },
          orderBy: { id: "asc" },
        },
        venda_pagamento: {
          where: { status: "confirmado" },
          include: { forma_pagamento: { select: { nome: true } } },
          orderBy: { id: "asc" },
        },
      },
    }),
    prisma.empresa.findUnique({ where: { id: 1 } }),
  ]);

  if (!venda) notFound();

  if (venda.tipo_cupom !== "nao_fiscal") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-zinc-700">
          Esta venda não tem cupom não fiscal para imprimir.
        </p>
        <Link href="/vendas/hoje" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para vendas de hoje
        </Link>
      </div>
    );
  }

  const nomeEmpresa =
    empresa?.nome_fantasia?.trim() || empresa?.razao_social?.trim() || null;
  const data = venda.finalizado_em ?? venda.atualizado_em;

  return (
    <div className="flex flex-col gap-4">
      <style>{`@media print { @page { size: 80mm auto; margin: 4mm; } }`}</style>
      <div className="print-ocultar flex flex-wrap items-center justify-between gap-3">
        <Link href="/vendas/hoje" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para vendas de hoje
        </Link>
        <ImprimirCupomButton />
      </div>

      <article className="cupom-nao-fiscal mx-auto w-[80mm] max-w-full border border-zinc-300 bg-white px-3 py-4 text-[12px] leading-tight text-black">
        <header className="mb-3 text-center">
          {nomeEmpresa ? (
            <p className="text-[14px] font-semibold uppercase">{nomeEmpresa}</p>
          ) : null}
          {empresa?.cnpj ? (
            <p className="mt-1 font-data">CNPJ {formatarCnpjCpf(empresa.cnpj)}</p>
          ) : null}
          {empresa?.endereco?.trim() ? (
            <p className="mt-1">{empresa.endereco.trim()}</p>
          ) : null}
        </header>

        <p className="border-t border-dashed border-zinc-400 pt-2 font-medium">
          Venda #{venda.numero}
        </p>
        <p className="font-data">{formatarDataHora(data)}</p>
        {venda.cliente?.nome ? (
          <p className="mt-1">Cliente: {venda.cliente.nome}</p>
        ) : null}

        <ul className="mt-3 border-t border-dashed border-zinc-400 pt-2">
          {venda.venda_item.map((item) => (
            <li key={item.id} className="mb-2">
              <p className="font-medium">
                {item.vendido_em_pacote
                  ? linhaItemVenda(item.produto.nome, item)
                  : item.produto.nome}
              </p>
              {item.vendido_em_pacote ? null : (
                <p className="flex justify-between gap-2 font-data">
                  <span>
                    {rotuloQuantidadeItem(item)} × {formatarPreco(item.preco_unitario)}
                  </span>
                  <span>{formatarPreco(item.subtotal)}</span>
                </p>
              )}
            </li>
          ))}
        </ul>

        <div className="border-t border-dashed border-zinc-400 pt-2">
          {venda.venda_pagamento.map((pagamento) => (
            <p key={pagamento.id} className="flex justify-between gap-2">
              <span>{pagamento.forma_pagamento.nome}</span>
              <span className="font-data">{formatarPreco(pagamento.valor)}</span>
            </p>
          ))}
          <p className="mt-2 flex justify-between gap-2 text-[14px] font-semibold">
            <span>Total</span>
            <span className="font-data">{formatarPreco(venda.total)}</span>
          </p>
        </div>

        <p className="mt-4 border-2 border-black px-2 py-3 text-center text-[11px] font-bold uppercase leading-snug">
          Cupom não fiscal — sem valor fiscal, documento/tributo não recolhido
        </p>
      </article>
    </div>
  );
}
