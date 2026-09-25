import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  formatarDataHora,
  formatarPreco,
} from "@/lib/format";
import { formatarCnpjCpf, formatarTelefone } from "@/lib/documento";
import { exigirPdvOuVendas } from "@/lib/sessao";
import { LOGO_PUBLICA, existeLogoBlob } from "@/lib/empresa-logo";
import { itensComFreteNoFinal } from "@/lib/frete";
import {
  comFlagPeso,
  itemUsaLinhaCompleta,
  linhaItemVenda,
  rotuloQuantidadeItem,
} from "@/lib/venda-item";
import { textoCategoriaPrecoImpressao } from "@/lib/preco-categoria";
import { rotuloCategoriaPreco } from "@/lib/cliente";
import { ImprimirCupomButton } from "./imprimir-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ id: string }>;
};

function rotuloInstagram(valor: string | null | undefined) {
  const limpo = (valor ?? "").trim();
  if (!limpo) return null;
  return limpo.startsWith("@") ? limpo : `@${limpo}`;
}

function IconeWhatsApp() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3 shrink-0"
      aria-hidden
    >
      <path
        fill="#25D366"
        d="M12 2C6.48 2 2 6.21 2 11.4c0 1.86.55 3.6 1.5 5.1L2 22l5.7-1.47A10.3 10.3 0 0 0 12 20.8c5.52 0 10-4.21 10-9.4S17.52 2 12 2m0 16.9c-1.55 0-3.07-.4-4.4-1.16l-.31-.18-3.38.87.9-3.25-.2-.33A7.4 7.4 0 0 1 4.4 11.4C4.4 7.55 7.8 4.4 12 4.4s7.6 3.15 7.6 7c0 3.85-3.4 7.5-7.6 7.5m4.16-5.58c-.23-.11-1.35-.66-1.56-.74s-.36-.11-.51.12-.59.74-.72.89-.27.17-.5.06a6.1 6.1 0 0 1-1.8-1.1 6.7 6.7 0 0 1-1.24-1.54c-.13-.22 0-.34.1-.45.1-.1.23-.27.34-.4s.15-.23.23-.38.04-.29-.02-.4-.51-1.23-.7-1.69-.36-.38-.51-.39h-.44c-.15 0-.4.06-.61.28s-.8.78-.8 1.9.82 2.2.93 2.36c.11.15 1.61 2.45 3.9 3.44.55.24.97.38 1.3.48.55.17 1.04.15 1.44.09.44-.07 1.35-.55 1.54-1.08.19-.53.19-.99.13-1.08s-.2-.15-.43-.26"
      />
    </svg>
  );
}

function IconeInstagram() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default async function CupomNaoFiscalPage({ params }: Props) {
  await exigirPdvOuVendas();
  const { id } = await params;
  const vendaId = Number(id);
  if (!Number.isInteger(vendaId)) notFound();

  const [venda, empresa, temLogo] = await Promise.all([
    prisma.venda.findUnique({
      where: { id: vendaId },
      include: {
        cliente: { select: { nome: true } },
        venda_item: {
          include: {
            produto: {
              select: { nome: true, vendido_por_peso: true, tipo: true },
            },
          },
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
    existeLogoBlob(),
  ]);

  if (!venda) notFound();

  const nomeEmpresa =
    empresa?.nome_fantasia?.trim() || empresa?.razao_social?.trim() || null;
  const telefone = empresa?.telefone?.trim()
    ? formatarTelefone(empresa.telefone)
    : null;
  const instagram = rotuloInstagram(empresa?.instagram);
  const data = venda.finalizado_em ?? venda.atualizado_em;
  const categoriaImpressa = textoCategoriaPrecoImpressao(
    venda.tipo_preco,
    venda.venda_item,
  );
  const itens = itensComFreteNoFinal(venda.venda_item);
  const naoFiscal = venda.tipo_cupom === "nao_fiscal";

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
          {temLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={LOGO_PUBLICA}
              alt=""
              className="mx-auto mb-2 h-14 w-auto max-w-[48mm] object-contain"
            />
          ) : null}
          {nomeEmpresa ? (
            <p className="text-[14px] font-semibold uppercase">{nomeEmpresa}</p>
          ) : null}
          {empresa?.cnpj ? (
            <p className="mt-1 font-data">CNPJ {formatarCnpjCpf(empresa.cnpj)}</p>
          ) : null}
          {empresa?.endereco?.trim() ? (
            <p className="mt-1">{empresa.endereco.trim()}</p>
          ) : null}
          {telefone ? (
            <p className="mt-1 flex items-center justify-center gap-1">
              <IconeWhatsApp />
              <span className="font-data">{telefone}</span>
            </p>
          ) : null}
          {instagram ? (
            <p className="mt-1 flex items-center justify-center gap-1">
              <IconeInstagram />
              <span>{instagram}</span>
            </p>
          ) : null}
        </header>

        <p className="border-t border-dashed border-zinc-400 pt-2 font-medium">
          Venda #{venda.numero}
        </p>
        <p className="font-data">{formatarDataHora(data)}</p>
        {venda.cliente?.nome ? (
          <p className="mt-1">Cliente: {venda.cliente.nome}</p>
        ) : null}
        {categoriaImpressa ? <p className="mt-1">{categoriaImpressa}</p> : null}

        <ul className="mt-3 border-t border-dashed border-zinc-400 pt-2">
          {itens.map((item) => {
            const exibicao = comFlagPeso(item);
            return (
            <li key={item.id} className="mb-2">
              <p className="font-medium">
                {itemUsaLinhaCompleta(exibicao)
                  ? linhaItemVenda(item.produto.nome, exibicao)
                  : item.produto.nome}
                {item.tipo_preco_aplicado &&
                item.tipo_preco_aplicado !== "varejo"
                  ? ` · ${rotuloCategoriaPreco(item.tipo_preco_aplicado)}`
                  : ""}
              </p>
              {itemUsaLinhaCompleta(exibicao) ? null : (
                <p className="flex justify-between gap-2 font-data">
                  <span>
                    {rotuloQuantidadeItem(exibicao)} × {formatarPreco(item.preco_unitario)}
                  </span>
                  <span>{formatarPreco(item.subtotal)}</span>
                </p>
              )}
            </li>
            );
          })}
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

        {naoFiscal ? (
          <p className="mt-4 border-2 border-black px-2 py-3 text-center text-[11px] font-bold uppercase leading-snug">
            Cupom não fiscal — sem valor fiscal, documento/tributo não recolhido
          </p>
        ) : null}
      </article>
    </div>
  );
}
