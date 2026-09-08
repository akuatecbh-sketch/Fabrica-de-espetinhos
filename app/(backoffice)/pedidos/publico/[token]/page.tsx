import { prisma } from "@/lib/prisma";
import { nomeExibicaoCliente } from "@/lib/cliente";
import { obterLogoBlob } from "@/lib/empresa-logo";
import { formatarPreco } from "@/lib/format";
import { linhaItemVenda, rotuloQuantidadeItem } from "@/lib/venda-item";
import { ImprimirPedidoButton } from "./imprimir-button";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

async function logoDataUrl() {
  const logo = await obterLogoBlob();
  if (!logo) return null;
  const base64 = Buffer.from(logo.data).toString("base64");
  return `data:${logo.contentType};base64,${base64}`;
}

export default async function PedidoPublicoPage({ params }: Props) {
  const { token: tokenBruto } = await params;
  const token = tokenBruto.trim();

  const pedido =
    token.length > 0
      ? await prisma.pedido.findFirst({
          where: {
            token_publico: token,
            NOT: { status: "cancelado" },
          },
          include: {
            cliente: {
              select: {
                nome: true,
                tipo_pessoa: true,
                razao_social: true,
                nome_fantasia: true,
              },
            },
            pedido_item: {
              include: { produto: { select: { nome: true } } },
              orderBy: { id: "asc" },
            },
          },
        })
      : null;

  if (!pedido) {
    return (
      <main className="flex min-h-full items-center justify-center px-4 py-12">
        <p className="text-sm text-texto-secundario">Pedido não encontrado.</p>
      </main>
    );
  }

  const [empresa, logoSrc] = await Promise.all([
    prisma.empresa.findUnique({
      where: { id: 1 },
      select: { razao_social: true, nome_fantasia: true },
    }),
    logoDataUrl(),
  ]);
  const nomeEmpresa =
    empresa?.nome_fantasia?.trim() || empresa?.razao_social?.trim() || null;
  const nomeCliente = pedido.cliente
    ? nomeExibicaoCliente(pedido.cliente)
    : "Cliente não informado";

  return (
    <main className="mx-auto flex min-h-full w-full max-w-xl flex-col gap-6 px-4 py-8">
      <div className="print-ocultar flex justify-end">
        <ImprimirPedidoButton />
      </div>

      <article className="rounded-lg border border-borda bg-superficie p-6">
        <header className="flex flex-col items-center gap-3 border-b border-borda pb-4 text-center">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={nomeEmpresa ?? "Logo da empresa"}
              className="h-16 w-auto object-contain"
            />
          ) : null}
          {nomeEmpresa ? (
            <h1 className="text-xl font-semibold tracking-tight">{nomeEmpresa}</h1>
          ) : (
            <h1 className="text-xl font-semibold tracking-tight">Pedido</h1>
          )}
          <p className="text-sm text-texto-secundario">Pedido #{pedido.numero}</p>
        </header>

        <section className="mt-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-texto-secundario">
            Cliente
          </h2>
          <p className="mt-1 text-base font-medium text-texto-primario">
            {nomeCliente}
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-texto-secundario">
            Itens
          </h2>
          {pedido.pedido_item.length === 0 ? (
            <p className="mt-2 text-sm text-texto-secundario">
              Nenhum item neste pedido.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {pedido.pedido_item.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-0.5 border-b border-borda pb-3 last:border-0 last:pb-0"
                >
                  <p className="font-medium text-texto-primario">
                    {item.vendido_em_pacote
                      ? linhaItemVenda(item.produto.nome, item)
                      : item.produto.nome}
                  </p>
                  <p className="font-data text-sm text-texto-secundario">
                    {rotuloQuantidadeItem(item)}
                    {item.vendido_em_pacote
                      ? null
                      : ` × ${formatarPreco(item.preco_unitario)}`}
                  </p>
                  <p className="font-data text-sm font-medium">
                    {formatarPreco(item.subtotal)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-6 text-right text-lg font-semibold">
          Total:{" "}
          <span className="font-data">{formatarPreco(pedido.total)}</span>
        </p>
      </article>
    </main>
  );
}
