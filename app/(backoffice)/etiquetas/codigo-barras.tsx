"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { ean13Valido } from "@/lib/ean13";

export function CodigoBarrasEan13({
  valor,
  altura = 16,
}: {
  valor: string | null;
  altura?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const codigo = (valor ?? "").trim();
  const valido = ean13Valido(codigo);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    svg.replaceChildren();
    if (!valido) return;
    JsBarcode(svg, codigo, {
      format: "EAN13",
      width: 1.1,
      height: altura,
      displayValue: true,
      fontSize: 8,
      margin: 0,
      background: "transparent",
      lineColor: "#1a1d23",
    });
  }, [codigo, valido, altura]);

  if (!codigo) {
    return (
      <p className="text-[8px] leading-tight text-texto-secundario">
        Sem código de barras
      </p>
    );
  }

  if (!valido) {
    return (
      <p className="font-data text-[9px] leading-tight text-texto-primario">
        {codigo}
      </p>
    );
  }

  return (
    <svg
      ref={ref}
      className="w-full"
      style={{ maxHeight: `${altura + 8}px` }}
    />
  );
}
