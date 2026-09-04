"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
  type Ref,
} from "react";
import { Loader2, Search } from "lucide-react";

const MINIMO_PADRAO = 2;
const DEBOUNCE_PADRAO = 300;

export function BuscaAutocomplete<T>({
  buscar,
  label,
  placeholder,
  aoSelecionar,
  rotulo,
  descricao,
  chave,
  minimoCaracteres = MINIMO_PADRAO,
  debounceMs = DEBOUNCE_PADRAO,
  inputRef,
  limparAoSelecionar = false,
  aoAlterar,
  aoDigitar,
  disabled,
}: {
  buscar: (termo: string) => Promise<T[]>;
  label: string;
  placeholder?: string;
  aoSelecionar: (item: T) => void;
  rotulo: (item: T) => string;
  descricao?: (item: T) => string | null | undefined;
  chave: (item: T) => string | number;
  minimoCaracteres?: number;
  debounceMs?: number;
  inputRef?: Ref<HTMLInputElement>;
  limparAoSelecionar?: boolean;
  aoAlterar?: () => void;
  aoDigitar?: (termo: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const listaId = `${id}-lista`;
  const raizRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLInputElement | null>(null);
  const buscaSeq = useRef(0);
  const buscarRef = useRef(buscar);
  const rotuloRef = useRef(rotulo);
  const aoSelecionarRef = useRef(aoSelecionar);
  const aoAlterarRef = useRef(aoAlterar);
  const textoSelecionadoRef = useRef<string | null>(null);

  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<T[]>([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [consultou, setConsultou] = useState(false);
  const [indice, setIndice] = useState(-1);

  buscarRef.current = buscar;
  rotuloRef.current = rotulo;
  aoSelecionarRef.current = aoSelecionar;
  aoAlterarRef.current = aoAlterar;

  function ligarRef(el: HTMLInputElement | null) {
    campoRef.current = el;
    if (!inputRef) return;
    if (typeof inputRef === "function") inputRef(el);
    else (inputRef as MutableRefObject<HTMLInputElement | null>).current = el;
  }

  function fechar() {
    setAberto(false);
    setIndice(-1);
  }

  function selecionar(item: T) {
    const titulo = rotuloRef.current(item);
    textoSelecionadoRef.current = limparAoSelecionar ? null : titulo;
    setTexto(limparAoSelecionar ? "" : titulo);
    setResultados([]);
    setConsultou(false);
    setCarregando(false);
    fechar();
    aoSelecionarRef.current(item);
  }

  async function executarBusca(termo: string, selecionarUnico = false) {
    const seq = ++buscaSeq.current;
    setCarregando(true);
    try {
      const lista = await buscarRef.current(termo);
      if (seq !== buscaSeq.current) return;
      setResultados(lista);
      setConsultou(true);
      setIndice(lista.length > 0 ? 0 : -1);
      setAberto(true);
      if (selecionarUnico && lista.length === 1) {
        selecionar(lista[0]);
      }
    } finally {
      if (seq === buscaSeq.current) setCarregando(false);
    }
  }

  useEffect(() => {
    if (
      textoSelecionadoRef.current != null &&
      texto === textoSelecionadoRef.current
    ) {
      return;
    }
    if (
      textoSelecionadoRef.current != null &&
      texto !== textoSelecionadoRef.current
    ) {
      textoSelecionadoRef.current = null;
      aoAlterarRef.current?.();
    }

    const termo = texto.trim();
    if (termo.length < minimoCaracteres) {
      buscaSeq.current += 1;
      setResultados([]);
      setConsultou(false);
      setCarregando(false);
      setAberto(false);
      setIndice(-1);
      return;
    }

    const timer = window.setTimeout(() => {
      void executarBusca(termo);
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [texto, minimoCaracteres, debounceMs]);

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (!raizRef.current?.contains(evento.target as Node)) {
        fechar();
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Escape") {
      evento.preventDefault();
      fechar();
      return;
    }

    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      if (!aberto && resultados.length > 0) {
        setAberto(true);
        setIndice(0);
        return;
      }
      if (resultados.length === 0) return;
      setAberto(true);
      setIndice((atual) => (atual + 1) % resultados.length);
      return;
    }

    if (evento.key === "ArrowUp") {
      evento.preventDefault();
      if (resultados.length === 0) return;
      setAberto(true);
      setIndice((atual) =>
        atual <= 0 ? resultados.length - 1 : atual - 1,
      );
      return;
    }

    if (evento.key === "Enter") {
      evento.preventDefault();
      const termo = texto.trim();
      if (aberto && indice >= 0 && resultados[indice]) {
        selecionar(resultados[indice]);
        return;
      }
      if (termo.length >= minimoCaracteres) {
        void executarBusca(termo, true);
      }
    }
  }

  const termoExibido = texto.trim();
  const mostrarLista =
    aberto &&
    (carregando || resultados.length > 0 || consultou) &&
    termoExibido.length >= minimoCaracteres;
  const opcaoAtiva =
    indice >= 0 && resultados[indice]
      ? `${listaId}-opcao-${chave(resultados[indice])}`
      : undefined;

  return (
    <div ref={raizRef} className="relative flex flex-col gap-1 text-sm">
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-secundario"
          aria-hidden
        />
        <input
          id={id}
          ref={ligarRef}
          type="text"
          role="combobox"
          aria-expanded={mostrarLista}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={opcaoAtiva}
          autoComplete="off"
          disabled={disabled}
          value={texto}
          placeholder={placeholder}
          onChange={(evento) => {
            const valor = evento.target.value;
            setTexto(valor);
            aoDigitar?.(valor);
          }}
          onFocus={() => {
            if (
              resultados.length > 0 ||
              (consultou && termoExibido.length >= minimoCaracteres)
            ) {
              setAberto(true);
            }
          }}
          onKeyDown={aoTeclar}
          className="min-h-11 w-full rounded border border-borda py-2 pl-10 pr-10 text-sm disabled:opacity-60"
        />
        {carregando ? (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-texto-secundario"
            aria-label="Buscando"
          />
        ) : null}
      </div>

      {mostrarLista ? (
        <ul
          id={listaId}
          role="listbox"
          className="absolute top-full z-30 mt-1 max-h-64 w-full overflow-auto rounded border border-zinc-200 bg-white shadow-md"
        >
          {resultados.length > 0
            ? resultados.map((item, i) => {
                const idOpcao = `${listaId}-opcao-${chave(item)}`;
                const extra = descricao?.(item);
                const ativo = i === indice;
                return (
                  <li key={String(chave(item))} role="presentation">
                    <button
                      id={idOpcao}
                      type="button"
                      role="option"
                      aria-selected={ativo}
                      onMouseEnter={() => setIndice(i)}
                      onMouseDown={(evento) => evento.preventDefault()}
                      onClick={() => selecionar(item)}
                      className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm ${
                        ativo ? "bg-fundo-hover" : ""
                      }`}
                    >
                      <span className="font-medium text-texto-primario">
                        {rotulo(item)}
                      </span>
                      {extra ? (
                        <span className="font-data text-xs text-texto-secundario">
                          {extra}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            : !carregando && consultou ? (
                <li className="px-3 py-2 text-sm text-texto-secundario">
                  Nenhum resultado encontrado para &apos;{termoExibido}&apos;
                </li>
              ) : carregando ? (
                <li className="px-3 py-2 text-sm text-texto-secundario">
                  Buscando...
                </li>
              ) : null}
        </ul>
      ) : null}
    </div>
  );
}
