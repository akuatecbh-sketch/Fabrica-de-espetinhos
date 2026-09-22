"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type AprovarPedidoPublicoEstado = {
  error?: string;
};

export async function aprovarPedidoPublico(
  tokenBruto: string,
): Promise<AprovarPedidoPublicoEstado> {
  const token = tokenBruto.trim();
  if (!token) {
    return { error: "Pedido não encontrado." };
  }

  const pedido = await prisma.pedido.findFirst({
    where: { token_publico: token },
    select: { id: true, status: true },
  });

  if (!pedido) {
    return { error: "Pedido não encontrado." };
  }

  if (pedido.status !== "enviado") {
    return {
      error: "Só é possível aprovar um pedido que já foi enviado.",
    };
  }

  const atualizado = await prisma.pedido.updateMany({
    where: { id: pedido.id, status: "enviado" },
    data: {
      status: "aprovado",
      atualizado_em: new Date(),
    },
  });

  if (atualizado.count === 0) {
    return {
      error: "Só é possível aprovar um pedido que já foi enviado.",
    };
  }

  revalidatePath(`/pedidos/publico/${token}`);
  revalidatePath("/");
  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${pedido.id}`);
  return {};
}
