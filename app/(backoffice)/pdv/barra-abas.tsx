import { formatarPreco } from "@/lib/format";
import { criarVenda, focarVenda } from "./actions";

type Aba = {
  id: number;
  total: { toString(): string };
  status: string;
  clienteNome: string | null;
};

export function BarraAbas({
  abas,
  focoId,
}: {
  abas: Aba[];
  focoId: number | null;
}) {
  return (
    <div className="relative">
      <div className="flex items-end gap-1 overflow-x-auto scroll-px-2 border-b border-borda pb-px snap-x snap-mandatory lg:flex-wrap lg:overflow-visible lg:snap-none">
        {abas.map((aba) => {
          const emFoco = aba.id === focoId;
          const emEspera = aba.status === "em_espera";
          const rotulo = aba.clienteNome?.trim() || `Venda #${aba.id}`;
          return (
            <form
              key={aba.id}
              action={focarVenda.bind(null, aba.id)}
              className="snap-start shrink-0"
            >
              <button
                type="submit"
                disabled={emFoco}
                title={rotulo}
                className={[
                  "flex min-h-11 max-w-[14rem] items-center rounded-t border px-3 py-2 text-sm lg:min-h-0",
                  emEspera
                    ? "border-transparent bg-gradiente-brasa font-medium text-white pulso-brasa"
                    : emFoco
                      ? "border-borda border-b-superficie bg-superficie font-medium text-texto-primario"
                      : "border-transparent text-texto-secundario hover:bg-fundo-hover hover:text-texto-primario",
                ].join(" ")}
              >
                <span className="min-w-0 truncate">{rotulo}</span>
                <span
                  className={`ml-2 shrink-0 font-data ${emEspera ? "text-white/90" : "text-texto-secundario"}`}
                >
                  {formatarPreco(aba.total)}
                </span>
              </button>
            </form>
          );
        })}
        <form action={criarVenda} className="snap-start shrink-0">
          <button
            type="submit"
            className="mb-0.5 min-h-11 rounded bg-gradiente-brasa px-3 py-2 text-sm font-medium text-white lg:min-h-0"
          >
            Nova venda
          </button>
        </form>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-fundo to-transparent lg:hidden"
      />
    </div>
  );
}
