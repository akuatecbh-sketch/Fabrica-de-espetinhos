"use client";

import { useActionState } from "react";
import {
  mascaraCnpjCpf,
  mascaraTelefone,
  formatarCnpjCpf,
  formatarTelefone,
} from "@/lib/documento";
import { CampoMascarado } from "../campo-mascarado";
import { FeedbackBuscaCnpj, useBuscaCnpj } from "../use-busca-cnpj";
import type { FornecedorFormState } from "./actions";

const estadoInicial: FornecedorFormState = {};

type FornecedorInicial = {
  razao_social: string;
  nome_fantasia: string | null;
  cnpj_cpf: string;
  inscricao_estadual: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  contato_nome: string | null;
  ativo: boolean;
};

export function FornecedorForm({
  action,
  fornecedor,
  submitLabel,
}: {
  action: (
    estado: FornecedorFormState,
    formData: FormData,
  ) => Promise<FornecedorFormState>;
  fornecedor?: FornecedorInicial;
  submitLabel: string;
}) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const cnpj = useBuscaCnpj(fornecedor);

  return (
    <form action={formAction} className="flex w-full max-w-xl flex-col gap-4">
      {estado.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <CampoMascarado
          name="cnpj_cpf"
          label="CPF ou CNPJ"
          valorInicial={
            fornecedor?.cnpj_cpf
              ? formatarCnpjCpf(fornecedor.cnpj_cpf).replace("—", "")
              : ""
          }
          mascarar={mascaraCnpjCpf}
          required
          placeholder="000.000.000-00 ou 00.000.000/0000-00"
          onBlur={(valor) => void cnpj.consultarCnpj(valor)}
          acao={
            <button
              type="button"
              disabled={cnpj.buscandoCnpj}
              onClick={(evento) => {
                const campo = evento.currentTarget
                  .closest("label")
                  ?.querySelector<HTMLInputElement>('input[name="cnpj_cpf"]');
                void cnpj.consultarCnpj(campo?.value ?? "", true);
              }}
              className="shrink-0 rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              {cnpj.buscandoCnpj ? "Buscando..." : "Buscar dados"}
            </button>
          }
        />
        <FeedbackBuscaCnpj
          buscando={cnpj.buscandoCnpj}
          sucesso={cnpj.sucessoCnpj}
          aviso={cnpj.avisoCnpj}
        />
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Razão social
        <input
          name="razao_social"
          required
          maxLength={150}
          value={cnpj.razaoSocial}
          onChange={(evento) => cnpj.setRazaoSocial(evento.target.value)}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Nome fantasia
        <input
          name="nome_fantasia"
          maxLength={150}
          value={cnpj.nomeFantasia}
          onChange={(evento) => cnpj.setNomeFantasia(evento.target.value)}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Inscrição estadual
        <input
          name="inscricao_estadual"
          maxLength={20}
          value={cnpj.inscricaoEstadual}
          onChange={(evento) => cnpj.setInscricaoEstadual(evento.target.value)}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <CampoMascarado
        name="telefone"
        label="Telefone"
        valorInicial={
          fornecedor?.telefone
            ? formatarTelefone(fornecedor.telefone).replace("—", "")
            : ""
        }
        mascarar={mascaraTelefone}
        placeholder="(00) 00000-0000"
      />

      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          name="email"
          type="email"
          maxLength={150}
          defaultValue={fornecedor?.email ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Endereço
        <input
          name="endereco"
          maxLength={255}
          value={cnpj.endereco}
          onChange={(evento) => cnpj.setEndereco(evento.target.value)}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Nome do contato
        <input
          name="contato_nome"
          maxLength={100}
          defaultValue={fornecedor?.contato_nome ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          name="ativo"
          type="checkbox"
          defaultChecked={fornecedor?.ativo ?? true}
          className="rounded border-zinc-300"
        />
        Ativo
      </label>

      <button
        type="submit"
        disabled={pendente}
        className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
