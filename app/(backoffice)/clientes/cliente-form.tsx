"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  mascaraCpf,
  mascaraCnpj,
  mascaraTelefone,
  formatarCpf,
  formatarCnpjCpf,
  formatarTelefone,
  validarCnpj,
} from "@/lib/documento";
import {
  TIPO_PESSOA_FISICA,
  TIPO_PESSOA_JURIDICA,
  ehPessoaJuridica,
  type TipoPessoaCliente,
} from "@/lib/cliente";
import { isoDaData } from "@/lib/financeiro";
import { CampoMascarado } from "../campo-mascarado";
import { buscarDadosCnpj, type ClienteFormState } from "./actions";

const estadoInicial: ClienteFormState = {};

type ClienteInicial = {
  tipo_pessoa?: string | null;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  data_nascimento: Date | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  inscricao_estadual?: string | null;
  inscricao_municipal?: string | null;
  contato_nome?: string | null;
  contato_cargo?: string | null;
  contato_telefone?: string | null;
};

function tipoInicial(cliente?: ClienteInicial): TipoPessoaCliente {
  return ehPessoaJuridica(cliente?.tipo_pessoa)
    ? TIPO_PESSOA_JURIDICA
    : TIPO_PESSOA_FISICA;
}

export function ClienteForm({
  action,
  cliente,
  submitLabel,
}: {
  action: (
    estado: ClienteFormState,
    formData: FormData,
  ) => Promise<ClienteFormState>;
  cliente?: ClienteInicial;
  submitLabel: string;
}) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoaCliente>(
    tipoInicial(cliente),
  );
  const [razaoSocial, setRazaoSocial] = useState(cliente?.razao_social ?? "");
  const [nomeFantasia, setNomeFantasia] = useState(cliente?.nome_fantasia ?? "");
  const [inscricaoEstadual, setInscricaoEstadual] = useState(
    cliente?.inscricao_estadual ?? "",
  );
  const [endereco, setEndereco] = useState(cliente?.endereco ?? "");
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [avisoCnpj, setAvisoCnpj] = useState<string | null>(null);
  const [sucessoCnpj, setSucessoCnpj] = useState(false);
  const buscaId = useRef(0);
  const ultimoCnpjConsultado = useRef("");

  useEffect(() => {
    if (estado.tipo_pessoa) setTipoPessoa(estado.tipo_pessoa);
  }, [estado.tipo_pessoa]);

  const juridica = tipoPessoa === TIPO_PESSOA_JURIDICA;

  async function consultarCnpj(valor: string, forcar = false) {
    if (!validarCnpj(valor)) {
      if (forcar) {
        setAvisoCnpj("CNPJ inválido. Verifique os dígitos e tente novamente.");
        setSucessoCnpj(false);
      }
      return;
    }
    if (!forcar && ultimoCnpjConsultado.current === valor) return;

    const id = ++buscaId.current;
    setBuscandoCnpj(true);
    setAvisoCnpj(null);
    setSucessoCnpj(false);

    try {
      const resultado = await buscarDadosCnpj(valor);
      if (id !== buscaId.current) return;
      ultimoCnpjConsultado.current = valor;
      if (resultado.ok) {
        setRazaoSocial(resultado.dados.razao_social);
        setNomeFantasia(resultado.dados.nome_fantasia);
        setEndereco(resultado.dados.endereco);
        setInscricaoEstadual(resultado.dados.inscricao_estadual);
        setSucessoCnpj(true);
        return;
      }
      if (!cliente) {
        setRazaoSocial("");
        setNomeFantasia("");
        setEndereco("");
        setInscricaoEstadual("");
      }
      setAvisoCnpj(resultado.aviso);
    } catch {
      if (id !== buscaId.current) return;
      if (!cliente) {
        setRazaoSocial("");
        setNomeFantasia("");
        setEndereco("");
        setInscricaoEstadual("");
      }
      setAvisoCnpj(
        "Busca automática indisponível no momento — preencha manualmente",
      );
    } finally {
      if (id === buscaId.current) setBuscandoCnpj(false);
    }
  }

  return (
    <form action={formAction} className="flex w-full max-w-xl flex-col gap-4">
      {estado.error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.error}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Tipo de cliente</legend>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="tipo_pessoa"
              value={TIPO_PESSOA_FISICA}
              checked={!juridica}
              onChange={() => setTipoPessoa(TIPO_PESSOA_FISICA)}
            />
            Pessoa Física
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="tipo_pessoa"
              value={TIPO_PESSOA_JURIDICA}
              checked={juridica}
              onChange={() => setTipoPessoa(TIPO_PESSOA_JURIDICA)}
            />
            Pessoa Jurídica
          </label>
        </div>
      </fieldset>

      {juridica ? (
        <>
          <div className="flex flex-col gap-1">
            <CampoMascarado
              name="cnpj"
              label="CNPJ"
              valorInicial={
                cliente?.cnpj
                  ? formatarCnpjCpf(cliente.cnpj).replace("—", "")
                  : ""
              }
              mascarar={mascaraCnpj}
              required
              placeholder="00.000.000/0000-00"
              onBlur={(valor) => void consultarCnpj(valor)}
              acao={
                <button
                  type="button"
                  disabled={buscandoCnpj}
                  onClick={(evento) => {
                    const campo = evento.currentTarget
                      .closest("label")
                      ?.querySelector<HTMLInputElement>('input[name="cnpj"]');
                    void consultarCnpj(campo?.value ?? "", true);
                  }}
                  className="shrink-0 rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                >
                  {buscandoCnpj ? "Buscando..." : "Buscar dados"}
                </button>
              }
            />
            {buscandoCnpj ? (
              <p className="text-xs text-zinc-500">Consultando a base pública…</p>
            ) : null}
            {sucessoCnpj ? (
              <p className="text-xs text-emerald-700">
                Dados preenchidos automaticamente — confira antes de salvar
              </p>
            ) : null}
            {avisoCnpj ? (
              <p className="text-xs text-amber-800">{avisoCnpj}</p>
            ) : null}
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Razão social
            <input
              name="razao_social"
              required
              maxLength={150}
              value={razaoSocial}
              onChange={(evento) => setRazaoSocial(evento.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Nome fantasia
            <input
              name="nome_fantasia"
              maxLength={150}
              value={nomeFantasia}
              onChange={(evento) => setNomeFantasia(evento.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Inscrição estadual
            <input
              name="inscricao_estadual"
              maxLength={20}
              value={inscricaoEstadual}
              onChange={(evento) => setInscricaoEstadual(evento.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Inscrição municipal
            <input
              name="inscricao_municipal"
              maxLength={20}
              defaultValue={cliente?.inscricao_municipal ?? ""}
              className="rounded border border-zinc-300 px-3 py-2"
            />
            <span className="text-xs font-normal text-zinc-500">
              Não disponível via busca automática — consulte a prefeitura ou o
              cliente.
            </span>
          </label>
        </>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Nome
            <input
              name="nome"
              required
              maxLength={150}
              defaultValue={cliente?.nome ?? ""}
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </label>

          <CampoMascarado
            name="cpf"
            label="CPF"
            valorInicial={
              cliente?.cpf ? formatarCpf(cliente.cpf).replace("—", "") : ""
            }
            mascarar={mascaraCpf}
            placeholder="000.000.000-00"
          />
        </>
      )}

      <CampoMascarado
        name="telefone"
        label="Telefone"
        valorInicial={
          cliente?.telefone
            ? formatarTelefone(cliente.telefone).replace("—", "")
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
          defaultValue={cliente?.email ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Endereço
        <input
          name="endereco"
          maxLength={255}
          value={endereco}
          onChange={(evento) => setEndereco(evento.target.value)}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      {juridica ? (
        <fieldset className="flex flex-col gap-4 rounded border border-zinc-200 p-4">
          <legend className="px-1 text-sm font-medium">
            Contato responsável pela compra
          </legend>

          <label className="flex flex-col gap-1 text-sm">
            Nome do contato
            <input
              name="contato_nome"
              maxLength={100}
              defaultValue={cliente?.contato_nome ?? ""}
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Cargo do contato
            <input
              name="contato_cargo"
              maxLength={80}
              defaultValue={cliente?.contato_cargo ?? ""}
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </label>

          <CampoMascarado
            name="contato_telefone"
            label="Telefone do contato"
            valorInicial={
              cliente?.contato_telefone
                ? formatarTelefone(cliente.contato_telefone).replace("—", "")
                : ""
            }
            mascarar={mascaraTelefone}
            placeholder="(00) 00000-0000"
          />
        </fieldset>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          Data de nascimento
          <input
            name="data_nascimento"
            type="date"
            defaultValue={
              cliente?.data_nascimento
                ? isoDaData(cliente.data_nascimento)
                : ""
            }
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
      )}

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
