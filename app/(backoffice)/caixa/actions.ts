"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/lib/sessao";
import { arredondarDinheiro } from "@/lib/dinheiro";
import { obterResumoCaixa } from "@/lib/resumo-caixa";

export type CaixaFormState = {
  error?: string;
};

export async function abrirCaixa(
  _estado: CaixaFormState,
  formData: FormData,
): Promise<CaixaFormState> {
  const operador = await exigirModulo("caixa");
  const bruto = String(formData.get("valor_abertura") ?? "")
    .trim()
    .replace(",", ".");

  if (!bruto) {
    return { error: "Informe o valor de abertura." };
  }

  const valor_abertura = Number(bruto);
  if (!Number.isFinite(valor_abertura) || valor_abertura < 0) {
    return { error: "Valor de abertura inválido." };
  }

  const jaAberto = await prisma.caixa.findFirst({
    where: { status: "aberto" },
  });
  if (jaAberto) {
    redirect("/caixa");
  }

  await prisma.caixa.create({
    data: {
      usuario_abertura_id: operador.id,
      valor_abertura,
      status: "aberto",
    },
  });

  revalidatePath("/caixa");
  revalidatePath("/pdv");
  revalidatePath("/");
  redirect("/caixa");
}

export async function fecharCaixa(
  caixaId: number,
  _estado: CaixaFormState,
  formData: FormData,
): Promise<CaixaFormState> {
  const operador = await exigirModulo("caixa");
  const bruto = String(formData.get("valor_fechamento_informado") ?? "")
    .trim()
    .replace(",", ".");

  if (!bruto) {
    return { error: "Informe o valor contado no caixa." };
  }

  const valor_fechamento_informado = Number(bruto);
  if (!Number.isFinite(valor_fechamento_informado) || valor_fechamento_informado < 0) {
    return { error: "Valor contado inválido." };
  }

  const caixa = await prisma.caixa.findFirst({
    where: { id: caixaId, status: "aberto" },
  });
  if (!caixa) {
    return { error: "Não há caixa aberto para fechar." };
  }

  const pendentes = await prisma.venda.count({
    where: { status: { in: ["aberta", "em_espera"] } },
  });
  if (pendentes > 0) {
    return {
      error:
        "Existem vendas em andamento. Finalize ou cancele as abas do PDV antes de fechar o caixa.",
    };
  }

  const resumo = await obterResumoCaixa(caixa.id, caixa.valor_abertura);
  const valor_fechamento_sistema = resumo.valor_fechamento_sistema;
  const diferenca = arredondarDinheiro(
    valor_fechamento_informado - valor_fechamento_sistema,
  );

  await prisma.caixa.update({
    where: { id: caixa.id },
    data: {
      usuario_fechamento_id: operador.id,
      valor_fechamento_informado,
      valor_fechamento_sistema,
      diferenca,
      data_fechamento: new Date(),
      status: "fechado",
    },
  });

  revalidatePath("/caixa");
  revalidatePath("/pdv");
  revalidatePath("/");
  redirect("/caixa");
}
