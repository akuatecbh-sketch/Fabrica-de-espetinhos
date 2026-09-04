"use client";

import { useState, useTransition } from "react";
import { mascaraCnpjCpf } from "@/lib/documento";
import { criarFornecedorCompra, type FornecedorOpcao } from "./actions";

const OPCAO_NOVA = "__nova__";

export function FornecedorCampo({
  fornecedoresIniciais,
  valorInicial,
}: {
  fornecedoresIniciais: FornecedorOpcao[];
  valorInicial?: number;
}) {
  const [fornecedores, setFornecedores] = useState(fornecedoresIniciais);
  const [fornecedorId, setFornecedorId] = useState(
    valorInicial != null ? String(valorInicial) : "",
  );
  const [mostrarNovo, setMostrarNovo] = useState(false);
  const [razao, setRazao] = useState("");
  const [documento, setDocumento] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function aoMudarSelect(valor: string) {
    if (valor === OPCAO_NOVA) {
      setMostrarNovo(true);
      setErro(null);
      return;
    }
    setFornecedorId(valor);
  }

  function salvarNovo() {
    startTransition(async () => {
      const resultado = await criarFornecedorCompra(razao, documento);
      if (resultado.error || !resultado.fornecedor) {
        setErro(resultado.error ?? "Não foi possível criar o fornecedor.");
        return;
      }
      const criado = resultado.fornecedor;
      setFornecedores((atuais) =>
        [...atuais, criado].sort((a, b) =>
          (a.nome_fantasia || a.razao_social).localeCompare(
            b.nome_fantasia || b.razao_social,
            "pt-BR",
          ),
        ),
      );
      setFornecedorId(String(criado.id));
      setMostrarNovo(false);
      setRazao("");
      setDocumento("");
      setErro(null);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm">
        Fornecedor
        <select
          name="fornecedor_id"
          required
          value={fornecedorId}
          onChange={(evento) => aoMudarSelect(evento.target.value)}
          className="min-h-11 rounded border border-borda px-3 py-2"
        >
          <option value="">Selecione</option>
          {fornecedores.map((fornecedor) => (
            <option key={fornecedor.id} value={fornecedor.id}>
              {fornecedor.nome_fantasia || fornecedor.razao_social}
            </option>
          ))}
          <option value={OPCAO_NOVA}>+ Adicionar novo fornecedor</option>
        </select>
      </label>

      {mostrarNovo ? (
        <div
          className="flex flex-col gap-3 rounded border border-borda bg-fundo p-3"
          onKeyDown={(evento) => {
            if (evento.key === "Enter") evento.preventDefault();
          }}
        >
          <p className="text-sm font-medium">Novo fornecedor</p>
          {erro ? (
            <p className="rounded border border-vermelho-erro/40 bg-vermelho-erro/10 px-3 py-2 text-sm text-vermelho-erro">
              {erro}
            </p>
          ) : null}
          <label className="flex flex-col gap-1 text-sm">
            Razão social
            <input
              value={razao}
              maxLength={150}
              onChange={(evento) => setRazao(evento.target.value)}
              className="min-h-11 rounded border border-borda bg-superficie px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            CPF/CNPJ
            <input
              value={documento}
              onChange={(evento) =>
                setDocumento(mascaraCnpjCpf(evento.target.value))
              }
              placeholder="00.000.000/0000-00"
              className="min-h-11 rounded border border-borda bg-superficie px-3 py-2"
            />
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={pendente}
              onClick={salvarNovo}
              className="min-h-11 rounded bg-gradiente-brasa px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {pendente ? "Salvando..." : "Salvar fornecedor"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarNovo(false);
                setErro(null);
              }}
              className="text-sm text-texto-secundario hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
