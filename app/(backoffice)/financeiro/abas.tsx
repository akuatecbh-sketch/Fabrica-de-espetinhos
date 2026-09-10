import Link from "next/link";
import type { AbaFinanceiro } from "@/lib/financeiro";

const ABAS: { id: AbaFinanceiro; label: string }[] = [
  { id: "resumo", label: "Resumo" },
  { id: "faturamento", label: "Faturamento" },
  { id: "despesas", label: "Despesas" },
  { id: "receber", label: "Contas a Receber" },
  { id: "taxas", label: "Taxas de Cartão" },
];

export function AbasFinanceiro({ atual }: { atual: AbaFinanceiro }) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200">
      {ABAS.map((aba) => (
        <Link
          key={aba.id}
          href={`/financeiro?aba=${aba.id}`}
          className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm ${
            atual === aba.id
              ? "border-brasa font-medium text-texto-primario"
              : "border-transparent text-texto-secundario hover:text-texto-primario"
          }`}
        >
          {aba.label}
        </Link>
      ))}
    </nav>
  );
}
