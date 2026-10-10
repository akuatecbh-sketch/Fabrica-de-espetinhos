import { carregarContextoAcesso } from "@/lib/contexto-acesso";
import { prisma } from "@/lib/prisma";

export async function obterCaixaAberto() {
  const contexto = await carregarContextoAcesso();
  if (contexto.estado === "ok") return contexto.caixa;
  return prisma.caixa.findFirst({
    where: { status: "aberto" },
    orderBy: { data_abertura: "desc" },
  });
}
