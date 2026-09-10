"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/lib/sessao";
import { arredondarDinheiro } from "@/lib/dinheiro";
import {
  dataLocalISO,
  dataUtcMeiaNoite,
  diaAnteriorISO,
  isoDaData,
} from "@/lib/financeiro";

export type TaxaFormState = {
  error?: string;
};

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

export async function salvarTaxaCartao(
  _estado: TaxaFormState,
  formData: FormData,
): Promise<TaxaFormState> {
  const usuario = await exigirModulo("financeiro");
  const formaId = Number(texto(formData, "forma_pagamento_id"));
  const parcelas = Number(texto(formData, "numero_parcelas"));
  const percentual = arredondarDinheiro(
    Number(texto(formData, "percentual").replace(",", ".")),
  );

  if (!Number.isInteger(formaId) || formaId <= 0) {
    return { error: "Selecione a forma de pagamento." };
  }
  if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
    return { error: "Informe um percentual entre 0 e 100." };
  }

  const forma = await prisma.forma_pagamento.findUnique({
    where: { id: formaId },
    select: { id: true, tipo: true },
  });
  if (!forma) return { error: "Forma de pagamento não encontrada." };

  const parcelasPermitidas = forma.tipo === "credito";
  if (parcelasPermitidas) {
    if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 12) {
      return { error: "Número de parcelas deve ser entre 1 e 12." };
    }
  } else if (parcelas !== 1) {
    return { error: "Esta forma de pagamento aceita apenas 1 parcela." };
  }

  const hoje = dataLocalISO();
  const ontem = diaAnteriorISO(hoje);
  const adquirente = "Padrão";

  const vigente = await prisma.taxa_cartao.findFirst({
    where: {
      forma_pagamento_id: forma.id,
      numero_parcelas: parcelas,
      adquirente,
      vigencia_fim: null,
    },
  });

  if (vigente && Number(vigente.percentual) === percentual) {
    return { error: "Esta combinação já está vigente com esse percentual." };
  }

  await prisma.$transaction(async (tx) => {
    if (vigente) {
      const inicioAntiga = isoDaData(vigente.vigencia_inicio);
      const fim = ontem < inicioAntiga ? hoje : ontem;
      await tx.taxa_cartao.update({
        where: { id: vigente.id },
        data: {
          vigencia_fim: dataUtcMeiaNoite(fim),
          atualizado_em: new Date(),
        },
      });
    }

    await tx.taxa_cartao.create({
      data: {
        forma_pagamento_id: forma.id,
        adquirente,
        numero_parcelas: parcelas,
        percentual,
        vigencia_inicio: dataUtcMeiaNoite(hoje),
        vigencia_fim: null,
        usuario_id: usuario.id,
      },
    });
  });

  revalidatePath("/financeiro");
  redirect("/financeiro?aba=taxas");
}
