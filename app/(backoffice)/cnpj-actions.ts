"use server";

import { redirect } from "next/navigation";
import { soDigitos, validarCnpj } from "@/lib/documento";
import {
  AVISO_CNPJ_BUSCA_INDISPONIVEL,
  consultarDadosCnpjPublico,
  type DadosCnpjPublico,
} from "@/lib/cnpj-publico";
import { temAcesso } from "@/lib/permissoes";
import { obterUsuarioSessao } from "@/lib/sessao";

export type BuscaCnpjResultado =
  | { ok: true; dados: DadosCnpjPublico }
  | { ok: false; aviso: string };

export async function buscarDadosCnpj(
  cnpj: string,
): Promise<BuscaCnpjResultado> {
  const usuario = await obterUsuarioSessao();
  const [clientes, fornecedores] = await Promise.all([
    temAcesso(usuario.id, "clientes"),
    temAcesso(usuario.id, "fornecedores"),
  ]);
  if (!clientes && !fornecedores) redirect("/acesso-negado");

  try {
    if (!validarCnpj(cnpj)) {
      return {
        ok: false,
        aviso: "CNPJ inválido. Verifique os dígitos e tente novamente.",
      };
    }
    return await consultarDadosCnpjPublico(soDigitos(cnpj));
  } catch {
    return { ok: false, aviso: AVISO_CNPJ_BUSCA_INDISPONIVEL };
  }
}
