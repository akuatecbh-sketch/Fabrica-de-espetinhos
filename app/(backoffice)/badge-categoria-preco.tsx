import { rotuloCategoriaPreco } from "@/lib/cliente";
import { normalizarCategoriaPreco } from "@/lib/preco-categoria";

export function BadgeCategoriaPreco({
  categoria,
  ocultarVarejo = false,
}: {
  categoria: string | null | undefined;
  ocultarVarejo?: boolean;
}) {
  const valor = normalizarCategoriaPreco(categoria);
  if (ocultarVarejo && valor === "varejo") return null;

  const classes =
    valor === "atacado"
      ? "bg-blue-100 text-blue-800"
      : valor === "repasse"
        ? "bg-violet-100 text-violet-800"
        : "bg-zinc-100 text-zinc-700";

  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      {rotuloCategoriaPreco(valor)}
    </span>
  );
}
