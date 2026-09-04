import { prisma } from "@/lib/prisma";

const FORMAS_PADRAO = [
  { nome: "Dinheiro", tipo: "dinheiro" },
  { nome: "Cartão Crédito", tipo: "credito" },
  { nome: "Cartão Débito", tipo: "debito" },
  { nome: "Pix", tipo: "pix" },
] as const;

export async function garantirFormasPagamento() {
  const existentes = await prisma.forma_pagamento.findMany({
    orderBy: { id: "asc" },
  });
  if (existentes.length > 0) return existentes;

  await prisma.forma_pagamento.createMany({ data: [...FORMAS_PADRAO] });
  return prisma.forma_pagamento.findMany({ orderBy: { id: "asc" } });
}

export async function listarTaxasVigentes() {
  const taxas = await prisma.taxa_cartao.findMany({
    where: { vigencia_fim: null },
    orderBy: [{ forma_pagamento_id: "asc" }, { numero_parcelas: "asc" }],
  });
  return taxas.map((taxa) => ({
    id: taxa.id,
    forma_pagamento_id: taxa.forma_pagamento_id,
    numero_parcelas: taxa.numero_parcelas,
    percentual: Number(taxa.percentual),
  }));
}
