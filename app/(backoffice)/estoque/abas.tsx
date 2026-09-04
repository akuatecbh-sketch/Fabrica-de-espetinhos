import Link from "next/link";
import type { AbaModuloEstoque } from "@/lib/estoque";

const ABAS: { id: AbaModuloEstoque; label: string }[] = [
  { id: "geral", label: "Visão geral" },
  { id: "movimentacoes", label: "Movimentações" },
  { id: "ajuste", label: "Ajuste manual" },
  { id: "producao", label: "Sugestão de produção" },
];

export function AbasEstoque({ atual }: { atual: AbaModuloEstoque }) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200">
      {ABAS.map((aba) => (
        <Link
          key={aba.id}
          href={`/estoque?aba=${aba.id}`}
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
