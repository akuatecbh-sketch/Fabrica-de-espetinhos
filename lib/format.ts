export function formatarPreco(valor: { toString(): string } | null | undefined) {
  if (valor == null) return "—";
  const numero = Number(valor.toString());
  if (Number.isNaN(numero)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numero);
}

export function formatarData(data: Date) {
  const iso = data.toISOString().slice(0, 10);
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function formatarHora(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeStyle: "short",
  }).format(data);
}

export function formatarDataHora(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

export function formatarQuantidade(valor: { toString(): string } | null | undefined) {
  if (valor == null) return "—";
  const numero = Number(valor.toString());
  if (Number.isNaN(numero)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(numero);
}

export function rotuloTipo(tipo: string) {
  const mapa: Record<string, string> = {
    insumo: "Insumo",
    produto_final: "Produto final",
    embalagem: "Embalagem",
    revenda: "Revenda",
    custo_fixo: "Custo fixo",
    custo_variavel: "Custo variável",
    receita: "Receita",
  };
  return mapa[tipo] ?? tipo;
}
