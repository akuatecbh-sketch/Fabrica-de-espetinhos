import { prisma } from "@/lib/prisma";

export async function obterCaixaAberto() {
  return prisma.caixa.findFirst({
    where: { status: "aberto" },
    orderBy: { data_abertura: "desc" },
  });
}
