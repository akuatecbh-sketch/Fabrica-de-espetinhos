"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { tituloDaRota } from "@/lib/titulo-pagina";
import type { MapaAcessos } from "@/lib/permissoes-rotas";
import { FaqBuscaBotao, FaqBuscaProvider } from "./faq-busca";
import { Sidebar } from "./sidebar";

export const SIDEBAR_STORAGE_KEY = "espetinhos.sidebar.recolhida";

export function BackofficeShell({
  children,
  caixaAberto,
  perfil,
  nome,
  acessos,
}: {
  children: ReactNode;
  caixaAberto: boolean;
  perfil: string;
  nome: string;
  acessos: MapaAcessos;
}) {
  const pathname = usePathname();
  const [recolhida, setRecolhida] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useLayoutEffect(() => {
    try {
      setRecolhida(localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuAberto) return;

    function fecharEsc(evento: KeyboardEvent) {
      if (evento.key === "Escape") setMenuAberto(false);
    }

    document.addEventListener("keydown", fecharEsc);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fecharEsc);
      document.body.style.overflow = anterior;
    };
  }, [menuAberto]);

  function alternar() {
    setRecolhida((atual) => {
      const proximo = !atual;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, proximo ? "1" : "0");
      } catch {
        /* ignore */
      }
      return proximo;
    });
  }

  return (
    <FaqBuscaProvider>
    <div className="min-h-full bg-fundo text-texto-primario">
      <header className="print-ocultar fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-borda bg-superficie px-2 lg:hidden">
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setMenuAberto(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-texto-primario"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">
          {tituloDaRota(pathname)}
        </p>
        <FaqBuscaBotao variante="mobile" />
        {caixaAberto ? (
          <span className="shrink-0 rounded-full bg-gradiente-brasa px-2 py-0.5 text-xs font-medium text-white pulso-brasa">
            Caixa
          </span>
        ) : null}
      </header>

      {menuAberto ? (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
          className="print-ocultar fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      ) : null}

      <Sidebar
        recolhida={recolhida}
        menuAberto={menuAberto}
        perfil={perfil}
        nome={nome}
        acessos={acessos}
        onAlternar={alternar}
        onFecharMenu={() => setMenuAberto(false)}
      />

      <div
        className={`pt-14 lg:pt-0 print:ml-0 print:pt-0 ${recolhida ? "lg:ml-16" : "lg:ml-56"}`}
      >
        <main className="conteudo-app mx-auto w-full max-w-6xl px-4 py-4 md:px-6 md:py-8 print:m-0 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
    </div>
    </FaqBuscaProvider>
  );
}
