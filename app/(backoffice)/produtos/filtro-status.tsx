"use client";

import { useRouter } from "next/navigation";

export type StatusProdutoFiltro = "todos" | "ativos" | "inativos";

export function FiltroStatusProduto({
  aba,
  filtroEstoque,
  status,
}: {
  aba?: string;
  filtroEstoque: boolean;
  status: StatusProdutoFiltro;
}) {
  const router = useRouter();

  function mudar(valor: string) {
    const params = new URLSearchParams();
    if (aba) params.set("aba", aba);
    if (filtroEstoque) params.set("filtro", "estoque-baixo");
    if (valor !== "todos") params.set("status", valor);
    const query = params.toString();
    router.push(query ? `/produtos?${query}` : "/produtos");
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      Status
      <select
        value={status}
        onChange={(evento) => mudar(evento.target.value)}
        className="rounded border border-zinc-300 bg-white px-3 py-2"
      >
        <option value="todos">Todos</option>
        <option value="ativos">Ativos</option>
        <option value="inativos">Inativos</option>
      </select>
    </label>
  );
}
