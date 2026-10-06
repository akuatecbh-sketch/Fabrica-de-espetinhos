"use server";

import { redirect } from "next/navigation";
import { ehIsoData } from "@/lib/financeiro";
import { arredondarQuantidade } from "@/lib/dinheiro";
import { temAcesso } from "@/lib/permissoes";
import {
  calcularPreviaProducao,
  cancelarProducao,
  ErroProducao,
  registrarProducao,
  tokenIdempotenciaValido,
  type PlanoProducao,
} from "@/lib/producao";
import { obterUsuarioSessao } from "@/lib/usuario-sessao";

export type ProducaoFormState = {
  error?: string;
  previa?: PlanoProducao;
  produtoNome?: string;
  unidade?: string;
};

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

export async function registrarProducaoFormAction(
  _estado: ProducaoFormState,
  formData: FormData,
): Promise<ProducaoFormState> {
  const usuario = await obterUsuarioSessao();
  if (!(await temAcesso(usuario.id, "producao"))) {
    return { error: "Você não tem permissão para registrar produção." };
  }

  const produtoFinalId = Number(formData.get("produto_id"));
  const quantidade = Number(texto(formData, "quantidade").replace(",", "."));
  const dataIso = texto(formData, "data");
  const observacao = texto(formData, "observacao");
  const token = texto(formData, "token");
  const intencao = texto(formData, "intencao");
  const confirmarNegativo = formData.get("confirmar_negativo") === "on";

  if (!Number.isInteger(produtoFinalId) || produtoFinalId <= 0) {
    return { error: "Selecione um produto final." };
  }
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return { error: "Informe uma quantidade produzida maior que zero." };
  }
  if (!ehIsoData(dataIso)) {
    return { error: "Informe a data da produção." };
  }
  if (!tokenIdempotenciaValido(token)) {
    return { error: "Token do formulário inválido. Recarregue a página." };
  }

  const previa = await calcularPreviaProducao({
    produtoFinalId,
    quantidade,
  });
  if (!previa.ok) {
    return { error: previa.error };
  }

  if (intencao !== "confirmar") {
    return {
      previa: previa.plano,
      produtoNome: previa.produtoNome,
      unidade: previa.unidade,
    };
  }

  try {
    const resultado = await registrarProducao({
      produtoFinalId,
      quantidade: arredondarQuantidade(quantidade),
      dataIso,
      observacao,
      usuarioId: usuario.id,
      token,
      confirmarNegativo,
    });
    redirect(`/producao/${resultado.id}`);
  } catch (erro) {
    if (erro instanceof ErroProducao) {
      return {
        error: erro.message,
        previa: previa.plano,
        produtoNome: previa.produtoNome,
        unidade: previa.unidade,
      };
    }
    throw erro;
  }
}

export type CancelarProducaoState = {
  error?: string;
};

export async function cancelarProducaoFormAction(
  _estado: CancelarProducaoState,
  formData: FormData,
): Promise<CancelarProducaoState> {
  const usuario = await obterUsuarioSessao();
  if (!(await temAcesso(usuario.id, "cancelar_producao"))) {
    return { error: "Você não tem permissão para cancelar produção." };
  }

  const producaoId = Number(formData.get("producao_id"));
  const motivo = texto(formData, "motivo");
  const confirmarNegativoProduto =
    formData.get("confirmar_negativo_produto") === "on";

  if (!Number.isInteger(producaoId) || producaoId <= 0) {
    return { error: "Produção inválida." };
  }

  try {
    const resultado = await cancelarProducao({
      producaoId,
      usuarioId: usuario.id,
      motivo,
      confirmarNegativoProduto,
    });
    redirect(`/producao/${resultado.id}`);
  } catch (erro) {
    if (erro instanceof ErroProducao) {
      return { error: erro.message };
    }
    throw erro;
  }
}
