import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { exigirAcesso, temAcesso } from "@/lib/permissoes";
import {
  ehStatusPedido,
  hrefListaPedidos,
  numeroPedidoDaBusca,
  PEDIDOS_POR_PAGINA,
  rotuloStatusPedido,
  STATUS_PEDIDO,
} from "@/lib/pedido";
import { paginaDaUrl } from "@/lib/paginacao";
import { nomeExibicaoCliente } from "@/lib/cliente";
import { ListaPedidos } from "./lista-pedidos";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    filtro?: string;
    pagina?: string;
  }>;
};

export default async function PedidosPage({ searchParams }: Props) {
  const usuario = await exigirAcesso("pedidos");
  const {
    q: buscaBruta,
    status: statusBruto,
    filtro,
    pagina: paginaBruta,
  } = await searchParams;
  const busca = (buscaBruta ?? "").trim();
  const statusParam = statusBruto || filtro;
  const status =
    statusParam && ehStatusPedido(statusParam) ? statusParam : "todos";
  const pagina = paginaDaUrl(paginaBruta);
  const podeCancelarPedido = await temAcesso(usuario.id, "cancelar_pedido");

  const where: Prisma.pedidoWhereInput = {};
  if (status !== "todos") {
    where.status = status;
  }
  if (busca) {
    const or: Prisma.pedidoWhereInput[] = [
      { cliente: { nome: { contains: busca, mode: "insensitive" } } },
      { cliente: { razao_social: { contains: busca, mode: "insensitive" } } },
      { cliente: { nome_fantasia: { contains: busca, mode: "insensitive" } } },
    ];
    const numero = numeroPedidoDaBusca(busca);
    if (numero != null) {
      or.push({ numero });
    }
    where.OR = or;
  }

  const [total, pedidos] = await Promise.all([
    prisma.pedido.count({ where }),
    prisma.pedido.findMany({
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
      skip: (pagina - 1) * PEDIDOS_POR_PAGINA,
      take: PEDIDOS_POR_PAGINA,
    }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(total / PEDIDOS_POR_PAGINA));

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
          Buscar
          <input
            name="q"
            defaultValue={busca}
            placeholder="Nome, razão social ou número"
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Situação
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
        {status !== "todos" ? (
          <Link
            href={hrefListaPedidos({ q: busca || undefined })}
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
          >
            Limpar filtro de situação
          </Link>
        ) : null}
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
        podeCancelarPedido={podeCancelarPedido}
        pagina={pagina}
        totalPaginas={totalPaginas}
        hrefPagina={(proxima) =>
          hrefListaPedidos({
            q: busca || undefined,
            status,
            filtro: statusBruto ? undefined : filtro,
            pagina: proxima,
          })
        }
        vazio={
          busca || status !== "todos"
            ? "Nenhum pedido encontrado para esses filtros."
            : "Nenhum pedido cadastrado."
        }
      />
    </div>
  );
}
