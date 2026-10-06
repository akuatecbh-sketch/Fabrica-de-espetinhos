import {
  CATALOGO_AJUDA,
  type ItemCatalogoAjuda,
} from "@/lib/catalogo-ajuda";

export function ListaCatalogoAjuda({
  itens,
}: {
  itens: ItemCatalogoAjuda[];
}) {
  if (itens.length === 0) {
    return (
      <p className="text-sm text-texto-secundario">
        Nenhum item no catálogo.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-3 py-2 font-medium">Título</th>
            <th className="px-3 py-2 font-medium">Rota</th>
            <th className="px-3 py-2 font-medium">Módulo</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr
              key={item.id}
              className="border-b border-zinc-100 last:border-0"
            >
              <td className="px-3 py-2">
                <p className="font-medium text-texto-primario">{item.titulo}</p>
                <p className="text-xs text-texto-secundario">{item.descricao}</p>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{item.rota}</td>
              <td className="px-3 py-2 text-texto-secundario">
                {item.perfilMinimo
                  ? item.perfilMinimo
                  : item.modulo == null
                    ? "Todos"
                    : Array.isArray(item.modulo)
                      ? item.modulo.join(", ")
                      : item.modulo}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CatalogoAjudaSomenteLeitura() {
  const itens = [...CATALOGO_AJUDA].sort(
    (a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, "pt-BR"),
  );
  return <ListaCatalogoAjuda itens={itens} />;
}
