"use client";

import { useRef, type ReactNode } from "react";
import { dataLocalISO } from "@/lib/financeiro";

function periodoHoje(hoje = new Date()) {
  const iso = dataLocalISO(hoje);
  return { de: iso, ate: iso };
}

function periodoEsteMes(hoje = new Date()) {
  const de = dataLocalISO(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const ate = dataLocalISO(
    new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0),
  );
  return { de, ate };
}

function periodoUltimos30Dias(hoje = new Date()) {
  const ate = dataLocalISO(hoje);
  const inicio = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate() - 29,
  );
  return { de: dataLocalISO(inicio), ate };
}

const ATALHOS = [
  { id: "hoje", rotulo: "Hoje", periodo: periodoHoje },
  { id: "mes", rotulo: "Este mês", periodo: periodoEsteMes },
  { id: "30dias", rotulo: "Últimos 30 dias", periodo: periodoUltimos30Dias },
] as const;

const classeBotao =
  "rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50";

export function SeletorPeriodo({
  rota,
  de = "",
  ate = "",
  className,
  children,
}: {
  rota: string;
  de?: string;
  ate?: string;
  className?: string;
  children?: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  function aplicarPeriodo(novoDe: string, novoAte: string) {
    const form = formRef.current;
    if (!form) return;
    const campoDe = form.elements.namedItem("de");
    const campoAte = form.elements.namedItem("ate");
    if (campoDe instanceof HTMLInputElement) campoDe.value = novoDe;
    if (campoAte instanceof HTMLInputElement) campoAte.value = novoAte;
    form.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      method="get"
      action={rota}
      className={["flex flex-col gap-3", className].filter(Boolean).join(" ")}
    >
      {children}
      <div className="flex flex-wrap gap-2">
        {ATALHOS.map((atalho) => (
          <button
            key={atalho.id}
            type="button"
            className={classeBotao}
            onClick={() => {
              const periodo = atalho.periodo();
              aplicarPeriodo(periodo.de, periodo.ate);
            }}
          >
            {atalho.rotulo}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          De
          <input
            type="date"
            name="de"
            defaultValue={de}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          até
          <input
            type="date"
            name="ate"
            defaultValue={ate}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <button type="submit" className={classeBotao}>
          Filtrar
        </button>
      </div>
    </form>
  );
}
