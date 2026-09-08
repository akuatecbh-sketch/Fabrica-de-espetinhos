import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { exigirAcesso } from "@/lib/permissoes";
import { ehStatusPedido, rotuloStatusPedido, STATUS_PEDIDO } from "@/lib/pedido";
import { nomeExibicaoCliente } from "@/lib/cliente";
import { ListaPedidos } from "./lista-pedidos";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

export default async function PedidosPage({ searchParams }: Props) {
  await exigirAcesso("pedidos");
  const { q: buscaBruta, status: statusBruto } = await searchParams;
  const busca = (buscaBruta ?? "").trim();
  const status =
    statusBruto && ehStatusPedido(statusBruto) ? statusBruto : "todos";

  const where: Prisma.pedidoWhereInput = {};
  if (status !== "todos") {
    where.status = status;
  }
  if (busca) {
    where.cliente = {
      OR: [
        { nome: { contains: busca, mode: "insensitive" } },
        { razao_social: { contains: busca, mode: "insensitive" } },
        { nome_fantasia: { contains: busca, mode: "insensitive" } },
      ],
    };
  }

  const pedidos = await prisma.pedido.findMany({
    where,
    include: {
      cliente: {
        select: {
          nome: true,
          tipo_pessoa: true,
          razao_social: true,
          nome_fantasia: true,
        },
      },
    },
    orderBy: [{ criado_em: "desc" }, { id: "desc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
        <Link
          href="/pedidos/novo"
          className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
        >
          Novo pedido
        </Link>
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <label className="flex min-w-0 w-full flex-1 flex-col gap-1 text-sm sm:min-w-64">
          Buscar cliente
          <input
            name="q"
            defaultValue={busca}
            placeholder="Nome ou razão social"
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            name="status"
            defaultValue={status}
            className="rounded border border-zinc-300 bg-white px-3 py-2"
          >
            <option value="todos">Todos</option>
            {STATUS_PEDIDO.map((valor) => (
              <option key={valor} value={valor}>
                {rotuloStatusPedido(valor)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Filtrar
        </button>
      </form>

      <ListaPedidos
        pedidos={pedidos.map((pedido) => ({
          id: pedido.id,
          numero: pedido.numero,
          status: pedido.status,
          total: pedido.total,
          criado_em: pedido.criado_em,
          clienteNome: pedido.cliente
            ? nomeExibicaoCliente(pedido.cliente)
            : null,
        }))}
        vazio={
          busca || status !== "todos"
            ? "Nenhum pedido encontrado para esses filtros."
            : "Nenhum pedido cadastrado."
        }
      />
    </div>
  );
}
