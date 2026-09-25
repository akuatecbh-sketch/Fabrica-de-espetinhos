import Link from "next/link";

export type AbaSaude = "verificacoes" | "backups";

const ABAS: { id: AbaSaude; label: string }[] = [
  { id: "verificacoes", label: "Verificações" },
  { id: "backups", label: "Backups" },
];

export function abaSaudeDaUrl(valor: string | undefined): AbaSaude {
  return valor === "backups" ? "backups" : "verificacoes";
}

export function AbasSaude({ atual }: { atual: AbaSaude }) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200">
      {ABAS.map((aba) => (
        <Link
          key={aba.id}
          href={aba.id === "verificacoes" ? "/saude" : "/saude?aba=backups"}
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
