export function descontoAtacado(
  precoVenda: number,
  quantidadePorPacote: number,
  precoPacote: number,
) {
  const cheio = precoVenda * quantidadePorPacote;
  if (
    !Number.isFinite(precoVenda) ||
    !Number.isFinite(quantidadePorPacote) ||
    !Number.isFinite(precoPacote) ||
    !(cheio > 0)
  ) {
    return null;
  }
  if (precoPacote >= cheio) return { tipo: "sem" as const };
  return {
    tipo: "percentual" as const,
    valor: 100 - (precoPacote / cheio) * 100,
  };
}

export function rotuloDescontoAtacado(
  precoVenda: number,
  quantidadePorPacote: number,
  precoPacote: number,
) {
  const resultado = descontoAtacado(
    precoVenda,
    quantidadePorPacote,
    precoPacote,
  );
  if (!resultado) return null;
  if (resultado.tipo === "sem") return "Sem desconto no atacado";
  const percentual = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(resultado.valor);
  return `Desconto no atacado: ${percentual}%`;
}
