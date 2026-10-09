import Link from "next/link";

export function Paginacao({
  pagina,
  totalPaginas,
  hrefPara,
}: {
  pagina: number;
  totalPaginas: number;
  hrefPara: (pagina: number) => string;
}) {
  if (totalPaginas <= 1) return null;

  return (
    <nav className="flex flex-wrap items-center gap-3 text-sm">
      {pagina > 1 ? (
        <Link
          href={hrefPara(pagina - 1)}
          className="rounded border border-zinc-300 bg-white px-3 py-2 hover:bg-zinc-50"
        >
          Anterior
        </Link>
      ) : (
        <span className="px-3 py-2 text-texto-secundario">Anterior</span>
      )}
      <span className="text-texto-secundario">
        Página {pagina} de {totalPaginas}
      </span>
      {pagina < totalPaginas ? (
        <Link
          href={hrefPara(pagina + 1)}
          className="rounded border border-zinc-300 bg-white px-3 py-2 hover:bg-zinc-50"
        >
          Próxima
        </Link>
      ) : (
        <span className="px-3 py-2 text-texto-secundario">Próxima</span>
      )}
    </nav>
  );
}
