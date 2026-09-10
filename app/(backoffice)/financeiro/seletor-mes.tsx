export function SeletorMes({ mes }: { mes: string }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="aba" value="resumo" />
      <label className="flex flex-col gap-1 text-sm">
        Mês
        <input
          type="month"
          name="mes"
          defaultValue={mes}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
      >
        Ver mês
      </button>
    </form>
  );
}
