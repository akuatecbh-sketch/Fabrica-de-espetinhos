export const TIPOS_CATEGORIA_FINANCEIRA = [
  "custo_fixo",
  "custo_variavel",
  "receita",
] as const;

export type TipoCategoriaFinanceira =
  (typeof TIPOS_CATEGORIA_FINANCEIRA)[number];

export const TIPOS_CATEGORIA_PAGAR = [
  "custo_fixo",
  "custo_variavel",
] as const;

export function ehTipoCategoriaFinanceira(
  valor: string,
): valor is TipoCategoriaFinanceira {
  return (TIPOS_CATEGORIA_FINANCEIRA as readonly string[]).includes(valor);
}

export function ehTipoCategoriaPagar(
  valor: string,
): valor is (typeof TIPOS_CATEGORIA_PAGAR)[number] {
  return (TIPOS_CATEGORIA_PAGAR as readonly string[]).includes(valor);
}

export function rotuloTipoDespesa(tipo: string) {
  if (tipo === "custo_fixo") return "Fixa";
  if (tipo === "custo_variavel") return "Variável";
  return tipo;
}

export const ABAS_FINANCEIRO = [
  "resumo",
  "faturamento",
  "despesas",
  "receber",
  "taxas",
] as const;

export type AbaFinanceiro = (typeof ABAS_FINANCEIRO)[number];

export type AbaContasFinanceiro = "despesas" | "receber";

export function abaFinanceiroDaUrl(valor?: string): AbaFinanceiro {
  if (valor === "pagar" || valor === "despesas") return "despesas";
  if (valor === "faturamento") return "faturamento";
  if (valor === "receber") return "receber";
  if (valor === "taxas") return "taxas";
  return "resumo";
}

export function ehMesAno(valor: string) {
  if (!/^\d{4}-\d{2}$/.test(valor)) return false;
  const mes = Number(valor.slice(5, 7));
  const ano = Number(valor.slice(0, 4));
  return ano >= 2000 && ano <= 2100 && mes >= 1 && mes <= 12;
}

export function mesAtualISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

export function mesFinanceiroDaUrl(valor?: string) {
  return valor && ehMesAno(valor) ? valor : mesAtualISO();
}

export function limitesDoMesLocal(mesIso: string) {
  const ano = Number(mesIso.slice(0, 4));
  const mes = Number(mesIso.slice(5, 7));
  return {
    inicio: new Date(ano, mes - 1, 1),
    fim: new Date(ano, mes, 1),
  };
}

export function limitesDoMesUtc(mesIso: string) {
  const ano = Number(mesIso.slice(0, 4));
  const mes = Number(mesIso.slice(5, 7));
  return {
    inicio: new Date(Date.UTC(ano, mes - 1, 1)),
    fim: new Date(Date.UTC(ano, mes, 1)),
  };
}

export function rotuloMesAno(mesIso: string) {
  const ano = Number(mesIso.slice(0, 4));
  const mes = Number(mesIso.slice(5, 7));
  const nome = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(ano, mes - 1, 1));
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

export const STATUS_PAGAR = [
  "aberta",
  "atrasada",
  "paga",
  "cancelada",
] as const;

export const STATUS_RECEBER = [
  "aberta",
  "atrasada",
  "recebida",
  "cancelada",
] as const;

export function rotuloStatusConta(status: string) {
  const mapa: Record<string, string> = {
    aberta: "Aberta",
    atrasada: "Atrasada",
    paga: "Paga",
    recebida: "Recebida",
    cancelada: "Cancelada",
  };
  return mapa[status] ?? status;
}

export function classesBadgeStatus(status: string, atrasada = false) {
  if (atrasada || status === "atrasada" || status === "cancelada") {
    return "rounded bg-vermelho-erro/10 px-2 py-0.5 text-xs font-medium text-vermelho-erro";
  }
  if (status === "paga" || status === "recebida") {
    return "rounded bg-verde-sucesso/10 px-2 py-0.5 text-xs font-medium text-verde-sucesso";
  }
  return "rounded bg-ambar/10 px-2 py-0.5 text-xs font-medium text-ambar";
}

export function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function dataUtcMeiaNoite(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function diaAnteriorISO(hojeIso = dataLocalISO()) {
  const data = dataUtcMeiaNoite(hojeIso);
  data.setUTCDate(data.getUTCDate() - 1);
  return isoDaData(data);
}

export function isoDaData(data: Date) {
  return data.toISOString().slice(0, 10);
}

export function contaAtrasada(status: string, dataVencimento: Date, hojeIso: string) {
  if (status === "atrasada") return true;
  return status === "aberta" && isoDaData(dataVencimento) < hojeIso;
}

export function ocorrenciasMensais(inicio: Date, quantidade: number) {
  const datas: Date[] = [];
  const dia = inicio.getUTCDate();
  const ano0 = inicio.getUTCFullYear();
  const mes0 = inicio.getUTCMonth();

  for (let i = 0; i < quantidade; i += 1) {
    const base = new Date(Date.UTC(ano0, mes0 + i, 1));
    const ultimoDia = new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0),
    ).getUTCDate();
    base.setUTCDate(Math.min(dia, ultimoDia));
    datas.push(base);
  }

  return datas;
}

export function ehIsoData(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}
