"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent as KeyboardEventReact,
} from "react";
import { BadgeCategoriaPreco } from "../badge-categoria-preco";
import { formatarCnpjCpf, formatarTelefone } from "@/lib/documento";
import {
  listarClientesPdv,
  vincularClienteVenda,
  type ClientePdvLista,
} from "./actions";

export const PDV_FOCO_PRODUTO = "pdv-foco-produto";

type Props = {
  vendaId: number;
  cliente: { id: number; nome: string } | null;
  aberto: boolean;
  onFechar: () => void;
  onCadastrarNovo: (termo: string) => void;
};

function outroOverlayAberto() {
  if (document.querySelector('[data-modal-aberto="pagamento"]')) return true;
  return Boolean(
    document.querySelector('[role="dialog"][aria-label="Buscar ajuda"]'),
  );
}

function focarBuscaProduto() {
  try {
    sessionStorage.setItem(PDV_FOCO_PRODUTO, "1");
  } catch {
    /* ignore */
  }
  window.setTimeout(() => {
    document.getElementById("pdv-busca-produto")?.focus();
  }, 0);
}

export function PdvF8SemVenda() {
  useEffect(() => {
    function atalho(evento: globalThis.KeyboardEvent) {
      if (evento.key !== "F8" || evento.repeat) return;
      evento.preventDefault();
    }
    window.addEventListener("keydown", atalho, true);
    return () => window.removeEventListener("keydown", atalho, true);
  }, []);
  return null;
}

export function LocalizarClienteModal({
  vendaId,
  cliente,
  aberto,
  onFechar,
  onCadastrarNovo,
}: Props) {
  const tituloId = useId();
  const buscaRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const seqRef = useRef(0);
  const [termo, setTermo] = useState("");
  const [itens, setItens] = useState<ClientePdvLista[]>([]);
  const [temMais, setTemMais] = useState(false);
  const [indice, setIndice] = useState(-1);
  const [carregando, setCarregando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [consultou, setConsultou] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function fechar() {
    onFechar();
  }

  useEffect(() => {
    if (aberto) return;
    seqRef.current += 1;
    setTermo("");
    setItens([]);
    setTemMais(false);
    setIndice(-1);
    setCarregando(false);
    setCarregandoMais(false);
    setConsultou(false);
    setErro(null);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const timer = window.setTimeout(() => buscaRef.current?.focus(), 0);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;

    const seq = ++seqRef.current;
    const imediato = termo.trim() === "";
    const executar = async () => {
      setCarregando(true);
      setCarregandoMais(false);
      setErro(null);
      setItens([]);
      setTemMais(false);
      setIndice(-1);
      setConsultou(false);
      try {
        const resultado = await listarClientesPdv(termo, 0);
        if (seq !== seqRef.current) return;
        setItens(resultado.itens);
        setTemMais(resultado.temMais);
        setIndice(resultado.itens.length > 0 ? 0 : -1);
        setConsultou(true);
      } catch {
        if (seq !== seqRef.current) return;
        setErro("Não foi possível buscar os clientes.");
        setItens([]);
        setTemMais(false);
        setIndice(-1);
        setConsultou(true);
      } finally {
        if (seq === seqRef.current) setCarregando(false);
      }
    };

    if (imediato) {
      void executar();
      return;
    }
    const timer = window.setTimeout(() => {
      void executar();
    }, 300);
    return () => {
      window.clearTimeout(timer);
    };
  }, [aberto, termo]);

  useEffect(() => {
    if (!aberto || indice < 0) return;
    const linha = listaRef.current?.querySelector<HTMLElement>(
      `[data-indice="${indice}"]`,
    );
    linha?.scrollIntoView({ block: "nearest" });
  }, [aberto, indice]);

  function escolher(clienteId: number) {
    if (pendente) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await vincularClienteVenda(vendaId, clienteId);
      if (resultado.error) {
        setErro(resultado.error);
        return;
      }
      focarBuscaProduto();
      fechar();
    });
  }

  async function carregarMais() {
    if (carregando || carregandoMais || pendente || !temMais) return;
    const seq = seqRef.current;
    setCarregandoMais(true);
    setErro(null);
    try {
      const resultado = await listarClientesPdv(termo, itens.length);
      if (seq !== seqRef.current) return;
      setItens((atual) => [...atual, ...resultado.itens]);
      setTemMais(resultado.temMais);
    } catch {
      if (seq !== seqRef.current) return;
      setErro("Não foi possível carregar mais clientes.");
    } finally {
      if (seq === seqRef.current) setCarregandoMais(false);
    }
  }

  function mover(delta: number) {
    if (itens.length === 0) return;
    setIndice((atual) => {
      const base = atual < 0 ? 0 : atual;
      return Math.min(itens.length - 1, Math.max(0, base + delta));
    });
  }

  function aoTeclarBusca(evento: KeyboardEventReact<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      mover(1);
      return;
    }
    if (evento.key === "ArrowUp") {
      evento.preventDefault();
      mover(-1);
      return;
    }
    if (evento.key === "Enter") {
      evento.preventDefault();
      const escolhido = indice >= 0 ? itens[indice] : undefined;
      if (escolhido) escolher(escolhido.id);
    }
  }

  if (!aberto) return null;

  const vazio = consultou && !carregando && itens.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40 md:items-start md:justify-center md:overflow-y-auto md:p-4"
      data-modal-aberto="cliente"
    >
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0"
        onClick={fechar}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="sheet-mobile relative z-10 flex h-[100dvh] w-full flex-col bg-superficie p-5 md:mt-8 md:h-auto md:max-h-[min(36rem,calc(100dvh-4rem))] md:max-w-2xl md:rounded md:border md:border-borda md:shadow-lg md:[animation:none]"
        onKeyDown={(evento) => {
          if (evento.key === "Enter" && evento.target instanceof HTMLInputElement) {
            evento.preventDefault();
          }
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={tituloId} className="text-lg font-medium">
            Localizar cliente
          </h2>
          <button
            type="button"
            onClick={fechar}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded text-sm font-medium text-texto-primario md:min-h-0 md:min-w-0"
          >
            Fechar
          </button>
        </div>

        {cliente ? (
          <p className="mb-3 text-sm text-texto-secundario">
            Vinculado nesta venda:{" "}
            <span className="font-medium text-texto-primario">{cliente.nome}</span>
            . Clique em outro para trocar; os itens já lançados permanecem.
          </p>
        ) : null}

        {erro ? (
          <p className="mb-3 rounded border border-vermelho-erro/40 bg-vermelho-erro/10 px-3 py-2 text-sm text-vermelho-erro">
            {erro}
          </p>
        ) : null}

        <label className="flex flex-col gap-1 text-sm">
          Buscar
          <input
            ref={buscaRef}
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            onKeyDown={aoTeclarBusca}
            placeholder="Nome, CPF, CNPJ ou telefone"
            autoComplete="off"
            disabled={pendente}
            className="min-h-11 rounded border border-borda bg-superficie px-3 py-2 text-sm disabled:opacity-60"
          />
        </label>

        <ul
          ref={listaRef}
          role="listbox"
          className="mt-3 min-h-0 flex-1 overflow-auto rounded border border-zinc-200"
        >
          {itens.map((item, i) => {
            const ativo = i === indice;
            const vinculado = cliente?.id === item.id;
            return (
              <li key={item.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={ativo}
                  data-indice={i}
                  disabled={pendente}
                  onMouseEnter={() => setIndice(i)}
                  onClick={() => escolher(item.id)}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-zinc-100 px-3 py-2 text-left text-sm last:border-0 disabled:opacity-60 ${
                    ativo ? "bg-fundo-hover" : ""
                  }`}
                >
                  <span className="flex flex-wrap items-center gap-2 font-medium text-texto-primario">
                    {item.nome}
                    <BadgeCategoriaPreco categoria={item.categoria_preco} />
                    {vinculado ? (
                      <span className="rounded bg-verde-bg px-2 py-0.5 text-xs font-medium text-texto-primario">
                        Nesta venda
                      </span>
                    ) : null}
                  </span>
                  <span className="font-data text-xs text-texto-secundario">
                    {formatarCnpjCpf(item.cnpj || item.cpf)}
                    {" · "}
                    {formatarTelefone(item.telefone)}
                  </span>
                </button>
              </li>
            );
          })}
          {carregando && itens.length === 0 ? (
            <li className="px-3 py-2 text-sm text-texto-secundario">
              Buscando...
            </li>
          ) : null}
          {vazio ? (
            <li className="px-3 py-3 text-sm text-texto-secundario">
              Nenhum cliente encontrado
            </li>
          ) : null}
        </ul>

        {temMais ? (
          <button
            type="button"
            disabled={carregandoMais || pendente}
            onClick={() => void carregarMais()}
            className="mt-2 min-h-11 rounded border border-borda bg-superficie px-3 py-2 text-sm text-texto-primario hover:bg-fundo-hover disabled:opacity-60"
          >
            {carregandoMais ? "Carregando..." : "Carregar mais"}
          </button>
        ) : null}

        {vazio ? (
          <button
            type="button"
            disabled={pendente}
            onClick={() => {
              const buscado = termo;
              fechar();
              onCadastrarNovo(buscado);
            }}
            className="mt-3 min-h-11 w-fit rounded bg-gradiente-brasa px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Cadastrar novo cliente
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function useAtalhoLocalizarCliente(params: {
  habilitado: boolean;
  aberto: boolean;
  onAbrir: () => void;
  onFechar: () => void;
}) {
  const { habilitado, aberto, onAbrir, onFechar } = params;
  useEffect(() => {
    function atalho(evento: globalThis.KeyboardEvent) {
      if (evento.repeat) return;
      if (evento.key === "F8") {
        evento.preventDefault();
        if (aberto) {
          evento.stopImmediatePropagation();
          onFechar();
          return;
        }
        if (!habilitado) return;
        if (outroOverlayAberto()) return;
        evento.stopImmediatePropagation();
        onAbrir();
        return;
      }
      if (evento.key === "Escape" && aberto) {
        evento.preventDefault();
        evento.stopImmediatePropagation();
        onFechar();
      }
    }
    window.addEventListener("keydown", atalho, true);
    return () => window.removeEventListener("keydown", atalho, true);
  }, [aberto, habilitado, onAbrir, onFechar]);
}
