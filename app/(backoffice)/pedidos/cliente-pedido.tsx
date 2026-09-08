"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BuscaAutocomplete } from "@/components/busca-autocomplete";
import { formatarCnpjCpf, mascaraCpf, mascaraTelefone } from "@/lib/documento";
import {
  buscarClientesPedido,
  cadastrarClienteNoPedido,
  removerClientePedido,
  vincularClientePedido,
} from "./actions";

type Props = {
  pedidoId: number | null;
  cliente: { id: number; nome: string } | null;
  somenteLeitura: boolean;
};

export function ClientePedido({ pedidoId, cliente, somenteLeitura }: Props) {
  const [modo, setModo] = useState<"resumo" | "busca" | "cadastro">(
    cliente ? "resumo" : "busca",
  );
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [nomeNovo, setNomeNovo] = useState("");
  const [cpfNovo, setCpfNovo] = useState("");
  const [telefoneNovo, setTelefoneNovo] = useState("");
  const [pendente, startTransition] = useTransition();
  const buscaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setModo(cliente ? "resumo" : "busca");
    setBusca("");
    setErro(null);
    setNomeNovo("");
    setCpfNovo("");
    setTelefoneNovo("");
  }, [cliente?.id]);

  function vincular(clienteId: number) {
    setErro(null);
    startTransition(async () => {
      const resultado = await vincularClientePedido(pedidoId, clienteId);
      if (resultado.error) {
        setErro(resultado.error);
      }
    });
  }

  function remover() {
    if (pedidoId == null) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await removerClientePedido(pedidoId);
      if (resultado.error) {
        setErro(resultado.error);
      }
    });
  }

  function cadastrar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await cadastrarClienteNoPedido(pedidoId, {
        nome: nomeNovo,
        cpf: cpfNovo,
        telefone: telefoneNovo,
      });
      if (resultado.error) {
        setErro(resultado.error);
      }
    });
  }

  return (
    <section className="rounded border border-borda bg-superficie p-3">
      <h2 className="text-lg font-medium">Cliente</h2>

      {erro ? (
        <p className="mt-2 rounded border border-vermelho-erro/40 bg-vermelho-erro/10 px-3 py-2 text-sm text-vermelho-erro">
          {erro}
        </p>
      ) : null}

      {somenteLeitura ? (
        <p className="mt-2 font-medium text-texto-primario">
          {cliente?.nome ?? "Sem cliente"}
        </p>
      ) : null}

      {!somenteLeitura && modo === "resumo" && cliente ? (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="min-w-0 font-medium text-texto-primario">
              {cliente.nome}
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={pendente}
                onClick={() => {
                  setErro(null);
                  setModo("busca");
                  window.setTimeout(() => buscaRef.current?.focus(), 0);
                }}
                className="min-h-11 rounded border border-borda bg-superficie px-3 py-2 text-sm text-texto-primario hover:bg-fundo-hover disabled:opacity-60 lg:min-h-0"
              >
                Trocar
              </button>
              <button
                type="button"
                disabled={pendente}
                onClick={remover}
                className="min-h-11 rounded border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60 lg:min-h-0"
              >
                {pendente ? "Removendo..." : "Remover"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!somenteLeitura && modo === "busca" ? (
        <div className="mt-2 flex flex-col gap-2">
          {cliente ? (
            <p className="text-sm text-texto-secundario">
              Atual:{" "}
              <span className="font-medium text-texto-primario">
                {cliente.nome}
              </span>
            </p>
          ) : null}
          <BuscaAutocomplete
            buscar={buscarClientesPedido}
            label="Buscar cliente"
            placeholder="Nome, CPF ou CNPJ"
            chave={(item) => item.id}
            rotulo={(item) => item.nome}
            descricao={(item) => formatarCnpjCpf(item.cnpj || item.cpf)}
            aoSelecionar={(item) => vincular(item.id)}
            limparAoSelecionar
            inputRef={buscaRef}
            aoDigitar={setBusca}
            disabled={pendente}
          />
          <button
            type="button"
            onClick={() => {
              setErro(null);
              setNomeNovo(
                busca.replace(/[\d./-]/g, " ").replace(/\s+/g, " ").trim(),
              );
              setModo("cadastro");
            }}
            className="w-fit text-sm font-medium text-texto-primario hover:underline"
          >
            + Cadastrar novo cliente
          </button>
          {cliente ? (
            <button
              type="button"
              onClick={() => {
                setErro(null);
                setModo("resumo");
              }}
              className="w-fit text-sm text-texto-secundario hover:underline"
            >
              Cancelar
            </button>
          ) : null}
        </div>
      ) : null}

      {!somenteLeitura && modo === "cadastro" ? (
        <div
          className="mt-2 flex flex-col gap-3 rounded border border-borda bg-fundo p-3"
          onKeyDown={(evento) => {
            if (evento.key === "Enter") evento.preventDefault();
          }}
        >
          <p className="text-sm font-medium">Novo cliente</p>
          <label className="flex flex-col gap-1 text-sm">
            Nome
            <input
              value={nomeNovo}
              maxLength={150}
              onChange={(evento) => setNomeNovo(evento.target.value)}
              className="min-h-11 rounded border border-borda bg-superficie px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            CPF
            <input
              value={cpfNovo}
              onChange={(evento) => setCpfNovo(mascaraCpf(evento.target.value))}
              placeholder="000.000.000-00"
              className="min-h-11 rounded border border-borda bg-superficie px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Telefone
            <input
              value={telefoneNovo}
              onChange={(evento) =>
                setTelefoneNovo(mascaraTelefone(evento.target.value))
              }
              placeholder="(00) 00000-0000"
              className="min-h-11 rounded border border-borda bg-superficie px-3 py-2"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pendente}
              onClick={cadastrar}
              className="min-h-11 rounded bg-gradiente-brasa px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {pendente ? "Salvando..." : "Salvar e vincular"}
            </button>
            <button
              type="button"
              onClick={() => {
                setErro(null);
                setModo("busca");
              }}
              className="text-sm text-texto-secundario hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
