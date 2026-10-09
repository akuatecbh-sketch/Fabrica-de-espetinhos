import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirAcesso } from "@/lib/permissoes";
import { formatarCnpjCpf, formatarTelefone } from "@/lib/documento";
import { formatarPreco } from "@/lib/format";
import { existeLogoBlob, LOGO_PUBLICA } from "@/lib/empresa-logo";
import { rotuloQuantidadeItem } from "@/lib/venda-item";
import {
  documentoPedidoImpressao,
  enderecoPedidoImpressao,
  formatoImpressaoDaUrl,
  nomeClientePedidoImpressao,
  telefonePedidoImpressao,
  type PedidoImpressaoDados,
} from "@/lib/pedido-impressao";
import { PedidoLayoutA4 } from "../../impressao/layout-a4";
import { PedidoLayoutCupom } from "../../impressao/layout-cupom";
import {
  RestaurarFormatoImpressaoPedido,
  SeletorFormatoImpressaoPedido,
} from "../../impressao/seletor-formato";
import { ImprimirPedidoButton } from "../../publico/[token]/imprimir-button";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ formato?: string }>;
};

export default async function ImprimirPedidoPage({
  params,
  searchParams,
}: Props) {
  await exigirAcesso("pedidos");
  const { id: idBruto } = await params;
  const { formato: formatoBruto } = await searchParams;
  const id = Number(idBruto);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [pedido, empresa, temLogo] = await Promise.all([
    prisma.pedido.findUnique({
      where: { id },
      include: {
        cliente: {
          select: {
            nome: true,
            tipo_pessoa: true,
            razao_social: true,
            nome_fantasia: true,
            telefone: true,
            contato_telefone: true,
            endereco: true,
            cpf: true,
            cnpj: true,
          },
        },
        pedido_item: {
          include: { produto: { select: { nome: true } } },
          orderBy: { id: "asc" },
        },
      },
    }),
    prisma.empresa.findUnique({ where: { id: 1 } }),
    existeLogoBlob(),
  ]);
  if (!pedido) notFound();

  const formato = formatoImpressaoDaUrl(formatoBruto);
  const nomeEmpresa =
    empresa?.nome_fantasia?.trim() || empresa?.razao_social?.trim() || null;
  const dados: PedidoImpressaoDados = {
    numero: pedido.numero,
    data: pedido.criado_em,
    observacao: pedido.observacao,
    total: pedido.total,
    subtotal: pedido.subtotal,
    desconto: pedido.desconto,
    clienteNome: nomeClientePedidoImpressao(pedido.cliente),
    clienteTelefone: telefonePedidoImpressao(pedido.cliente),
    clienteEndereco: enderecoPedidoImpressao(pedido.cliente?.endereco),
    clienteDocumento: documentoPedidoImpressao(pedido.cliente),
    itens: pedido.pedido_item.map((item) => ({
      id: item.id,
      nome: item.produto.nome,
      quantidade: rotuloQuantidadeItem(item),
      precoUnitario: formatarPreco(item.preco_unitario),
      subtotal: formatarPreco(item.subtotal),
      observacao: item.observacao,
    })),
    entregueEm: pedido.entregue_em,
    recebidoPorNome: pedido.recebido_por_nome,
  };

  const propsLayout = {
    pedido: dados,
    nomeEmpresa,
    logoSrc: temLogo ? LOGO_PUBLICA : null,
    cnpjEmpresa: empresa?.cnpj ? formatarCnpjCpf(empresa.cnpj) : null,
    enderecoEmpresa: empresa?.endereco?.trim() || null,
    telefoneEmpresa: empresa?.telefone?.trim()
      ? formatarTelefone(empresa.telefone)
      : null,
  };

  return (
    <div className="flex flex-col gap-4">
      <style>
        {formato === "80mm"
          ? `@media print { @page { size: 80mm auto; margin: 4mm; } }`
          : `@media print { @page { size: A4; margin: 12mm; } }`}
      </style>
      <RestaurarFormatoImpressaoPedido
        pedidoId={pedido.id}
        formatoUrl={formatoBruto}
      />
      <div className="print-ocultar flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/pedidos/${pedido.id}`}
          className="text-sm text-zinc-600 hover:underline"
        >
          ← Voltar para o pedido
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <SeletorFormatoImpressaoPedido
            pedidoId={pedido.id}
            formato={formato}
          />
          <ImprimirPedidoButton />
        </div>
      </div>
      {formato === "80mm" ? (
        <PedidoLayoutCupom {...propsLayout} />
      ) : (
        <PedidoLayoutA4 {...propsLayout} />
      )}
    </div>
  );
}
