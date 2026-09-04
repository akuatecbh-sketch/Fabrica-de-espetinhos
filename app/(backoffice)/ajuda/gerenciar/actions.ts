"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirGerenteOuSuperAdmin } from "@/lib/sessao";

export type FaqFormState = {
  error?: string;
};

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

async function lerDados(formData: FormData) {
  const titulo = texto(formData, "titulo");
  const palavras_chave = texto(formData, "palavras_chave");
  const resposta = texto(formData, "resposta");
  const rota_destino = texto(formData, "rota_destino");
  const modulo_chave = texto(formData, "modulo_chave");
  const ordemBruto = texto(formData, "ordem");
  const ativo = formData.get("ativo") === "on";

  if (!titulo) return { error: "Informe o título." } as const;
  if (titulo.length > 200) {
    return { error: "O título deve ter no máximo 200 caracteres." } as const;
  }
  if (!resposta) return { error: "Informe a resposta." } as const;
  if (!rota_destino) return { error: "Informe a rota de destino." } as const;
  if (!rota_destino.startsWith("/")) {
    return { error: "A rota deve começar com /." } as const;
  }
  if (rota_destino.length > 200) {
    return { error: "A rota deve ter no máximo 200 caracteres." } as const;
  }
  if (palavras_chave.length > 500) {
    return { error: "As palavras-chave devem ter no máximo 500 caracteres." } as const;
  }

  const ordem = ordemBruto === "" ? 0 : Number(ordemBruto);
  if (!Number.isInteger(ordem)) {
    return { error: "A ordem deve ser um número inteiro." } as const;
  }

  let modulo: string | null = null;
  if (modulo_chave) {
    const existe = await prisma.modulo.findUnique({
      where: { chave: modulo_chave },
      select: { chave: true },
    });
    if (!existe) return { error: "Módulo inválido." } as const;
    modulo = existe.chave;
  }

  return {
    titulo,
    palavras_chave: palavras_chave || null,
    resposta,
    rota_destino,
    modulo_chave: modulo,
    ordem,
    ativo,
  };
}

export async function criarFaq(
  _estado: FaqFormState,
  formData: FormData,
): Promise<FaqFormState> {
  await exigirGerenteOuSuperAdmin();
  const dados = await lerDados(formData);
  if ("error" in dados) return { error: dados.error };

  await prisma.faq_item.create({
    data: {
      titulo: dados.titulo,
      palavras_chave: dados.palavras_chave,
      resposta: dados.resposta,
      rota_destino: dados.rota_destino,
      modulo_chave: dados.modulo_chave,
      ordem: dados.ordem,
      ativo: dados.ativo,
    },
  });

  revalidatePath("/ajuda/gerenciar");
  redirect("/ajuda/gerenciar");
}

export async function atualizarFaq(
  id: number,
  _estado: FaqFormState,
  formData: FormData,
): Promise<FaqFormState> {
  await exigirGerenteOuSuperAdmin();
  const dados = await lerDados(formData);
  if ("error" in dados) return { error: dados.error };

  await prisma.faq_item.update({
    where: { id },
    data: {
      titulo: dados.titulo,
      palavras_chave: dados.palavras_chave,
      resposta: dados.resposta,
      rota_destino: dados.rota_destino,
      modulo_chave: dados.modulo_chave,
      ordem: dados.ordem,
      ativo: dados.ativo,
      atualizado_em: new Date(),
    },
  });

  revalidatePath("/ajuda/gerenciar");
  redirect("/ajuda/gerenciar");
}

export async function desativarFaq(id: number): Promise<FaqFormState> {
  await exigirGerenteOuSuperAdmin();
  await prisma.faq_item.update({
    where: { id },
    data: { ativo: false, atualizado_em: new Date() },
  });
  revalidatePath("/ajuda/gerenciar");
  return {};
}

export async function reativarFaq(id: number): Promise<FaqFormState> {
  await exigirGerenteOuSuperAdmin();
  await prisma.faq_item.update({
    where: { id },
    data: { ativo: true, atualizado_em: new Date() },
  });
  revalidatePath("/ajuda/gerenciar");
  return {};
}
