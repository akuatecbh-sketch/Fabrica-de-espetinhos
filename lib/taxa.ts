export function resolverTaxa(params: {
  tipo: string;
  formaPagamentoId: number;
  numeroParcelas: number;
  taxas: {
    id: number;
    forma_pagamento_id: number;
    numero_parcelas: number;
    percentual: number;
  }[];
}) {
  if (params.tipo === "dinheiro" || params.tipo === "fiado") {
    return { taxa_cartao_id: null as number | null, percentual: 0 };
  }
  const encontrada = params.taxas.find(
    (taxa) =>
      taxa.forma_pagamento_id === params.formaPagamentoId &&
      taxa.numero_parcelas === params.numeroParcelas,
  );
  if (!encontrada) {
    return { taxa_cartao_id: null as number | null, percentual: 0 };
  }
  return {
    taxa_cartao_id: encontrada.id,
    percentual: encontrada.percentual,
  };
}
