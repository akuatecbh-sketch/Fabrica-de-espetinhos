import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirAcesso } from "@/lib/permissoes";
import { nomeExibicaoCliente } from "@/lib/cliente";
import { PedidoTela } from "../pedido-tela";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PedidoPage({ params }: Props) {
  await exigirAcesso("pedidos");
  const { id: idBruto } = await params;
  const id = Number(idBruto);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      cliente: {
        select: {
          id: true,
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
  });
  if (!pedido) notFound();

  return (
    <PedidoTela
      pedido={{
        id: pedido.id,
        numero: pedido.numero,
        status: pedido.status,
        observacao: pedido.observacao,
        tokenPublico: pedido.token_publico,
        total: pedido.total,
        cliente: pedido.cliente
          ? { id: pedido.cliente.id, nome: nomeExibicaoCliente(pedido.cliente) }
          : null,
        itens: pedido.pedido_item.map((item) => ({
          id: item.id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: item.subtotal,
          vendido_em_pacote: item.vendido_em_pacote,
          quantidade_pacotes: item.quantidade_pacotes,
          produtoNome: item.produto.nome,
        })),
      }}
    />
  );
}
