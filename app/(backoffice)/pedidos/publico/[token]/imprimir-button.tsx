"use client";

export function ImprimirPedidoButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
    >
      Imprimir
    </button>
  );
}
