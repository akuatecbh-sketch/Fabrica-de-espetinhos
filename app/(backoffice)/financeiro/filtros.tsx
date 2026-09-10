import type { AbaContasFinanceiro } from "@/lib/financeiro";

export function FiltrosContas({
  aba,
  status,
  de,
  ate,
  tipo = "todos",
}: {
  aba: AbaContasFinanceiro;
  status: string;
  de: string;
  ate: string;
  tipo?: string;
}) {
  return (
    <form method="get" className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <input type="hidden" name="aba" value={aba} />
      <label className="flex flex-col gap-1 text-sm">
        Status
        <select
          name="status"
          defaultValue={status}
          className="rounded border border-zinc-300 bg-white px-3 py-2"
        >
          <option value="aberta">Aberta</option>
          <option value="atrasada">Atrasada</option>
          <option value="pendentes">Pendentes</option>
          <option value={aba === "despesas" ? "paga" : "recebida"}>
            {aba === "despesas" ? "Paga" : "Recebida"}
          </option>
          <option value="cancelada">Cancelada</option>
          <option value="todas">Todas</option>
        </select>
      </label>
      {aba === "despesas" ? (
        <label className="flex flex-col gap-1 text-sm">
          Tipo
          <select
            name="tipo"
            defaultValue={tipo}
            className="rounded border border-zinc-300 bg-white px-3 py-2"
          >
            <option value="todos">Todos</option>
            <option value="custo_fixo">Fixa</option>
            <option value="custo_variavel">Variável</option>
          </select>
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        Vencimento de
        <input
          type="date"
          name="de"
          defaultValue={de}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        até
        <input
          type="date"
          name="ate"
          defaultValue={ate}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
      >
        Filtrar
      </button>
    </form>
  );
}
