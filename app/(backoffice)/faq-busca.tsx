"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type FaqItem = {
  id: number;
  titulo: string;
  resposta: string;
  rota_destino: string;
};

type FaqBuscaContexto = {
  abrir: () => void;
  fechar: () => void;
  aberto: boolean;
};

const Contexto = createContext<FaqBuscaContexto | null>(null);

function truncar(texto: string, limite = 140) {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length <= limite) return limpo;
  return `${limpo.slice(0, limite - 1)}…`;
}

export function useFaqBusca() {
  const ctx = useContext(Contexto);
  if (!ctx) {
    throw new Error("useFaqBusca deve ser usado dentro de FaqBuscaProvider");
  }
  return ctx;
}

export function FaqBuscaBotao({
  recolhida,
  variante = "sidebar",
}: {
  recolhida?: boolean;
  variante?: "sidebar" | "mobile";
}) {
  const [atalho, setAtalho] = useState("Ctrl+K");
  const { abrir } = useFaqBusca();

  useEffect(() => {
    const mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    setAtalho(mac ? "⌘K" : "Ctrl+K");
  }, []);

  if (variante === "mobile") {
    return (
      <button
        type="button"
        aria-label="Buscar ajuda"
        title={`Buscar (${atalho})`}
        onClick={abrir}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-texto-primario"
      >
        <Search className="h-5 w-5" aria-hidden />
      </button>
    );
  }

  const base = recolhida
    ? "relative flex items-center gap-2 rounded px-2.5 py-1.5 lg:justify-center lg:p-2 lg:gap-0"
    : "relative flex items-center gap-2 rounded px-2.5 py-1.5";

  return (
    <button
      type="button"
      aria-label="Buscar ajuda"
      title={`Buscar (${atalho})`}
      onClick={abrir}
      className={`group w-full ${base} text-sm text-texto-secundario hover:bg-fundo-hover hover:text-texto-primario`}
    >
      <Search className="h-4 w-4 shrink-0 text-texto-secundario group-hover:text-texto-primario" />
      <span className={recolhida ? "lg:hidden" : undefined}>Buscar</span>
      {!recolhida ? (
        <kbd className="ml-auto hidden rounded border border-borda bg-fundo px-1.5 py-0.5 text-[10px] font-medium text-texto-secundario lg:inline">
          {atalho}
        </kbd>
      ) : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded border border-borda bg-superficie px-2 py-1 text-xs font-medium text-texto-primario shadow lg:group-hover:block"
        >
          Buscar ({atalho})
        </span>
      )}
    </button>
  );
}

function ModalFaq({
  aberto,
  onFechar,
}: {
  aberto: boolean;
  onFechar: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listaId = useId();
  const [consulta, setConsulta] = useState("");
  const [debounced, setDebounced] = useState("");
  const [itens, setItens] = useState<FaqItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (!aberto) return;
    setConsulta("");
    setDebounced("");
    setIndice(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const t = window.setTimeout(() => setDebounced(consulta), 250);
    return () => window.clearTimeout(t);
  }, [consulta, aberto]);

  useEffect(() => {
    if (!aberto) return;
    const ac = new AbortController();
    setCarregando(true);
    const params = new URLSearchParams();
    if (debounced.trim()) params.set("q", debounced.trim());
    fetch(`/api/faq/search?${params.toString()}`, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("busca");
        return res.json() as Promise<{ itens: FaqItem[] }>;
      })
      .then((data) => {
        setItens(data.itens ?? []);
        setIndice(0);
      })
      .catch((erro) => {
        if (erro instanceof DOMException && erro.name === "AbortError") return;
        setItens([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setCarregando(false);
      });
    return () => ac.abort();
  }, [debounced, aberto]);

  function irPara(item: FaqItem) {
    onFechar();
    router.push(item.rota_destino);
  }

  function onKeyDown(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Escape") {
      evento.preventDefault();
      onFechar();
      return;
    }
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      if (itens.length === 0) return;
      setIndice((atual) => (atual + 1) % itens.length);
      return;
    }
    if (evento.key === "ArrowUp") {
      evento.preventDefault();
      if (itens.length === 0) return;
      setIndice((atual) => (atual - 1 + itens.length) % itens.length);
      return;
    }
    if (evento.key === "Enter") {
      evento.preventDefault();
      const escolhido = itens[indice];
      if (escolhido) irPara(escolhido);
    }
  }

  if (!aberto) return null;

  const termo = consulta.trim();
  const vazio =
    !carregando && itens.length === 0 && termo
      ? `Nenhum resultado encontrado para '${termo}'`
      : null;

  return (
    <div className="print-ocultar fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh] sm:pt-[18vh]">
      <button
        type="button"
        aria-label="Fechar busca"
        className="absolute inset-0 bg-black/40"
        onClick={onFechar}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar ajuda"
        className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-lg border border-borda bg-superficie shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-borda px-3">
          <Search className="h-4 w-4 shrink-0 text-texto-secundario" aria-hidden />
          <input
            ref={inputRef}
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="O que você precisa fazer?"
            aria-autocomplete="list"
            aria-controls={listaId}
            aria-activedescendant={
              itens[indice] ? `${listaId}-opcao-${itens[indice].id}` : undefined
            }
            className="min-h-12 w-full border-0 bg-transparent px-1 py-3 text-sm outline-none"
          />
        </div>
        <ul id={listaId} role="listbox" className="max-h-80 overflow-y-auto p-1">
          {carregando && itens.length === 0 ? (
            <li className="px-3 py-3 text-sm text-texto-secundario">Buscando…</li>
          ) : null}
          {vazio ? (
            <li className="px-3 py-3 text-sm text-texto-secundario">{vazio}</li>
          ) : null}
          {!termo && !carregando && itens.length === 0 ? (
            <li className="px-3 py-3 text-sm text-texto-secundario">
              Nenhuma sugestão disponível.
            </li>
          ) : null}
          {itens.map((item, i) => {
            const ativo = i === indice;
            return (
              <li key={item.id} role="presentation">
                <button
                  type="button"
                  id={`${listaId}-opcao-${item.id}`}
                  role="option"
                  aria-selected={ativo}
                  onMouseEnter={() => setIndice(i)}
                  onClick={() => irPara(item)}
                  className={`flex w-full flex-col items-start gap-0.5 rounded px-3 py-2 text-left ${
                    ativo ? "bg-laranja-bg" : "hover:bg-fundo-hover"
                  }`}
                >
                  <span className="text-sm font-medium text-texto-primario">
                    {item.titulo}
                  </span>
                  <span className="line-clamp-2 text-xs text-texto-secundario">
                    {truncar(item.resposta)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function FaqBuscaProvider({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const abrir = useCallback(() => setAberto(true), []);
  const fechar = useCallback(() => setAberto(false), []);

  useEffect(() => {
    function atalho(evento: KeyboardEvent) {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        setAberto((atual) => !atual);
      }
    }
    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    function esc(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", esc);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  return (
    <Contexto.Provider value={{ abrir, fechar, aberto }}>
      {children}
      <ModalFaq aberto={aberto} onFechar={fechar} />
    </Contexto.Provider>
  );
}
