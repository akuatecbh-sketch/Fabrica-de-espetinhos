import Link from "next/link";
import { NfceBadge, type NfceResumo } from "./nfce-badge";

export function CupomVendaBadge({
  vendaId,
  tipoCupom,
  nfce,
}: {
  vendaId: number;
  tipoCupom: string;
  nfce: NfceResumo | null;
}) {
  if (tipoCupom === "nao_fiscal") {
    return (
      <div className="mt-1 flex flex-col items-start gap-1">
        <span className="inline-flex items-center rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
          Cupom não fiscal
        </span>
        <Link
          href={`/vendas/${vendaId}/cupom`}
          className="text-[11px] font-medium text-zinc-600 underline-offset-2 hover:underline"
        >
          Imprimir
        </Link>
      </div>
    );
  }

  if (tipoCupom === "nfe") {
    return (
      <div className="mt-1 flex flex-col items-start gap-1">
        <span className="inline-flex items-center rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
          NF-e
        </span>
        <Link
          href="/notas-fiscais"
          className="text-[11px] font-medium text-zinc-600 underline-offset-2 hover:underline"
        >
          Ver notas fiscais
        </Link>
      </div>
    );
  }

  if (tipoCupom === "nenhum") {
    return (
      <div className="mt-1">
        <span className="inline-flex items-center rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
          Sem cupom
        </span>
      </div>
    );
  }

  return <NfceBadge vendaId={vendaId} nfce={nfce} />;
}
