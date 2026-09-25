import { formatarTamanhoBackup, type ItemBackup } from "@/lib/backup";

export function ListaBackups({ backups }: { backups: ItemBackup[] }) {
  if (backups.length === 0) {
    return (
      <p className="text-sm text-texto-secundario">
        Nenhum backup ainda. O automático roda todo domingo às 6h UTC e
        mantém os 8 arquivos mais recentes.
      </p>
    );
  }

  return (
    <ul className="flex flex-col overflow-hidden rounded border border-zinc-200 bg-white">
      {backups.map((backup) => (
        <li
          key={backup.chave}
          className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-3 py-2 last:border-0"
        >
          <div className="min-w-0">
            <p className="font-data text-sm text-texto-primario">{backup.chave}</p>
            <p className="text-sm text-texto-secundario">
              {formatarTamanhoBackup(backup.bytes)}
            </p>
          </div>
          <a
            href={`/api/backups/${encodeURIComponent(backup.chave)}`}
            className="inline-flex min-h-11 shrink-0 items-center rounded border border-borda px-3 text-sm text-texto-primario hover:bg-fundo"
          >
            Baixar
          </a>
        </li>
      ))}
    </ul>
  );
}
