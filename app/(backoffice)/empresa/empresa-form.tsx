"use client";

import { useActionState, useEffect, useState } from "react";
import {
  formatarCnpjCpf,
  formatarTelefone,
  mascaraCnpj,
  mascaraTelefone,
} from "@/lib/documento";
import { CampoMascarado } from "../campo-mascarado";
import { salvarEmpresa, type EmpresaFormState } from "./actions";

const estadoInicial: EmpresaFormState = {};
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

type EmpresaInicial = {
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  logo_url: string | null;
  atualizado_em: string | null;
};

export function EmpresaForm({ empresa }: { empresa: EmpresaInicial | null }) {
  const [estado, formAction, pendente] = useActionState(
    salvarEmpresa,
    estadoInicial,
  );
  const [logoLocal, setLogoLocal] = useState<string | null>(null);
  const [erroLogo, setErroLogo] = useState<string | null>(null);

  const logoSalva =
    empresa?.logo_url && !empresa.logo_url.startsWith("/uploads/")
      ? empresa.logo_url
      : null;
  const preview = logoLocal ?? logoSalva;
  const previewSrc =
    preview && !preview.startsWith("blob:") && empresa?.atualizado_em
      ? `${preview}?v=${empresa.atualizado_em}`
      : preview;

  useEffect(() => {
    if (!estado.ok) return;
    setLogoLocal((atual) => {
      if (atual) URL.revokeObjectURL(atual);
      return null;
    });
  }, [estado.ok]);

  return (
    <form
      action={formAction}
      className="flex w-full max-w-xl flex-col gap-4"
    >
      {estado.error ? (
        <p className="rounded border border-vermelho-erro/40 bg-vermelho-erro/10 px-3 py-2 text-sm text-vermelho-erro">
          {estado.error}
        </p>
      ) : null}
      {estado.ok && !estado.error ? (
        <p className="rounded border border-borda bg-fundo px-3 py-2 text-sm text-texto-primario">
          Dados da empresa salvos.
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Razão social
        <input
          name="razao_social"
          required
          maxLength={150}
          defaultValue={empresa?.razao_social ?? ""}
          className="min-h-11 rounded border border-borda px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Nome fantasia
        <input
          name="nome_fantasia"
          maxLength={150}
          defaultValue={empresa?.nome_fantasia ?? ""}
          className="min-h-11 rounded border border-borda px-3 py-2"
        />
      </label>

      <CampoMascarado
        name="cnpj"
        label="CNPJ"
        valorInicial={
          empresa?.cnpj ? formatarCnpjCpf(empresa.cnpj).replace("—", "") : ""
        }
        mascarar={mascaraCnpj}
        placeholder="00.000.000/0000-00"
      />

      <label className="flex flex-col gap-1 text-sm">
        Endereço
        <input
          name="endereco"
          maxLength={255}
          defaultValue={empresa?.endereco ?? ""}
          className="min-h-11 rounded border border-borda px-3 py-2"
        />
      </label>

      <CampoMascarado
        name="telefone"
        label="Telefone"
        valorInicial={
          empresa?.telefone
            ? formatarTelefone(empresa.telefone).replace("—", "")
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
          defaultValue={empresa?.email ?? ""}
          className="min-h-11 rounded border border-borda px-3 py-2"
        />
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-sm">Logomarca</p>
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt="Logomarca atual"
            className="h-24 w-auto max-w-full rounded border border-borda bg-superficie object-contain p-2"
          />
        ) : (
          <p className="text-sm text-texto-secundario">
            Nenhuma logomarca enviada ainda.
          </p>
        )}
        {erroLogo ? (
          <p className="text-sm text-vermelho-erro">{erroLogo}</p>
        ) : null}
        <input
          name="logo"
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          className="min-h-11 text-sm text-texto-secundario file:mr-3 file:min-h-11 file:rounded file:border-0 file:bg-gradiente-brasa file:px-3 file:text-sm file:font-medium file:text-white"
          onChange={(evento) => {
            const arquivo = evento.target.files?.[0];
            setErroLogo(null);
            if (logoLocal) URL.revokeObjectURL(logoLocal);
            if (!arquivo) {
              setLogoLocal(null);
              return;
            }
            const nome = arquivo.name.toLowerCase();
            const tipoOk =
              arquivo.type === "image/png" ||
              arquivo.type === "image/jpeg" ||
              nome.endsWith(".png") ||
              nome.endsWith(".jpg") ||
              nome.endsWith(".jpeg");
            if (!tipoOk) {
              setErroLogo("Envie uma imagem PNG ou JPG.");
              evento.target.value = "";
              setLogoLocal(null);
              return;
            }
            if (arquivo.size > MAX_LOGO_BYTES) {
              setErroLogo("A logomarca deve ter no máximo 2 MB.");
              evento.target.value = "";
              setLogoLocal(null);
              return;
            }
            setLogoLocal(URL.createObjectURL(arquivo));
          }}
        />
        <p className="text-xs text-texto-secundario">
          PNG ou JPG, até 2 MB. Um novo envio substitui a logo anterior.
        </p>
      </div>

      <button
        type="submit"
        disabled={pendente}
        className="min-h-11 rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Salvando..." : "Salvar dados da empresa"}
      </button>
    </form>
  );
}
