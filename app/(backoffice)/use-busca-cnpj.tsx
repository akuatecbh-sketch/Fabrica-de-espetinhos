"use client";

import { useRef, useState } from "react";
import { validarCnpj } from "@/lib/documento";
import { buscarDadosCnpj } from "./cnpj-actions";

export type CamposCnpj = {
  razao_social?: string | null;
  nome_fantasia?: string | null;
  endereco?: string | null;
  inscricao_estadual?: string | null;
};

export function useBuscaCnpj(inicial?: CamposCnpj) {
  const manterSeFalhar = inicial != null;
  const [razaoSocial, setRazaoSocial] = useState(inicial?.razao_social ?? "");
  const [nomeFantasia, setNomeFantasia] = useState(inicial?.nome_fantasia ?? "");
  const [inscricaoEstadual, setInscricaoEstadual] = useState(
    inicial?.inscricao_estadual ?? "",
  );
  const [endereco, setEndereco] = useState(inicial?.endereco ?? "");
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [avisoCnpj, setAvisoCnpj] = useState<string | null>(null);
  const [sucessoCnpj, setSucessoCnpj] = useState(false);
  const buscaId = useRef(0);
  const ultimoCnpjConsultado = useRef("");

  function limparCamposNovos() {
    if (manterSeFalhar) return;
    setRazaoSocial("");
    setNomeFantasia("");
    setEndereco("");
    setInscricaoEstadual("");
  }

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
      limparCamposNovos();
      setAvisoCnpj(resultado.aviso);
    } catch {
      if (id !== buscaId.current) return;
      limparCamposNovos();
      setAvisoCnpj(
        "Busca automática indisponível no momento — preencha manualmente",
      );
    } finally {
      if (id === buscaId.current) setBuscandoCnpj(false);
    }
  }

  return {
    razaoSocial,
    setRazaoSocial,
    nomeFantasia,
    setNomeFantasia,
    inscricaoEstadual,
    setInscricaoEstadual,
    endereco,
    setEndereco,
    buscandoCnpj,
    avisoCnpj,
    sucessoCnpj,
    consultarCnpj,
  };
}

export function FeedbackBuscaCnpj({
  buscando,
  sucesso,
  aviso,
}: {
  buscando: boolean;
  sucesso: boolean;
  aviso: string | null;
}) {
  return (
    <>
      {buscando ? (
        <p className="text-xs text-zinc-500">Consultando a base pública…</p>
      ) : null}
      {sucesso ? (
        <p className="text-xs text-emerald-700">
          Dados preenchidos automaticamente — confira antes de salvar
        </p>
      ) : null}
      {aviso ? <p className="text-xs text-amber-800">{aviso}</p> : null}
    </>
  );
}
