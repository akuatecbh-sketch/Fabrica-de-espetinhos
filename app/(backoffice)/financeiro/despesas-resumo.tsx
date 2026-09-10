import { formatarPreco } from "@/lib/format";

export function DespesasResumo({
  fixas,
  variaveis,
}: {
  fixas: { total: number; quantidade: number };
  variaveis: { total: number; quantidade: number };
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Bloco
        titulo="Despesas Fixas"
        total={fixas.total}
        quantidade={fixas.quantidade}
      />
      <Bloco
        titulo="Despesas Variáveis"
        total={variaveis.total}
        quantidade={variaveis.quantidade}
      />
    </div>
  );
}

function Bloco({
  titulo,
  total,
  quantidade,
}: {
  titulo: string;
  total: number;
  quantidade: number;
}) {
  return (
    <section className="rounded border border-zinc-200 bg-white px-4 py-3">
      <h2 className="text-sm font-medium text-texto-primario">{titulo}</h2>
      <p className="mt-2 font-data text-lg font-medium">
        {formatarPreco(total)}
      </p>
      <p className="text-xs text-texto-secundario">
        {quantidade === 1
          ? "1 conta em aberto"
          : `${quantidade} contas em aberto`}
      </p>
    </section>
  );
}
