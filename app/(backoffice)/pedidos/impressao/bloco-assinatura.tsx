import { formatarDataHora } from "@/lib/format";

export function BlocoAssinaturaPedido({
  entregueEm,
  recebidoPorNome,
  compacto = false,
}: {
  entregueEm?: Date | null;
  recebidoPorNome?: string | null;
  compacto?: boolean;
}) {
  const registrado =
    entregueEm || (recebidoPorNome ?? "").trim()
      ? [
          recebidoPorNome?.trim()
            ? `Recebido por: ${recebidoPorNome.trim()}`
            : null,
          entregueEm ? `Registrado em ${formatarDataHora(entregueEm)}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <section className={compacto ? "mt-4 text-center" : "mt-10"}>
      <p
        className={
          compacto
            ? "text-[11px] font-semibold uppercase"
            : "text-xs font-semibold uppercase tracking-wide text-zinc-600"
        }
      >
        Recebi e conferi
      </p>
      {registrado ? (
        <p className={compacto ? "mt-1 text-[11px]" : "mt-2 text-sm"}>
          {registrado}
        </p>
      ) : null}
      <div
        className={
          compacto
            ? "mt-6 space-y-4 text-[11px]"
            : "mt-8 grid gap-6 sm:grid-cols-3"
        }
      >
        <p className="border-t border-zinc-500 pt-1">Assinatura</p>
        <p className="border-t border-zinc-500 pt-1">Nome legível</p>
        <p className="border-t border-zinc-500 pt-1">Data</p>
      </div>
    </section>
  );
}
