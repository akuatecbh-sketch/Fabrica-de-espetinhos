import { dataLocalISO, ehIsoData } from "@/lib/financeiro";

export function periodoDaUrlComPadrao(
  de: string | undefined,
  ate: string | undefined,
  padrao: { de: string; ate: string },
) {
  const inicio = de && ehIsoData(de) ? de : padrao.de;
  const fim = ate && ehIsoData(ate) ? ate : padrao.ate;
  if (inicio > fim) return { de: fim, ate: inicio };
  return { de: inicio, ate: fim };
}

export function periodoHoje(hoje = new Date()) {
  const iso = dataLocalISO(hoje);
  return { de: iso, ate: iso };
}

export function periodoVendasDaUrl(de?: string, ate?: string) {
  return periodoDaUrlComPadrao(de, ate, periodoHoje());
}

export function limitesDoPeriodoLocal(de: string, ate: string) {
  const [anoInicio, mesInicio, diaInicio] = de.split("-").map(Number);
  const [anoFim, mesFim, diaFim] = ate.split("-").map(Number);
  const inicio = new Date(anoInicio, mesInicio - 1, diaInicio);
  const fim = new Date(anoFim, mesFim - 1, diaFim);
  fim.setDate(fim.getDate() + 1);
  return { inicio, fim };
}

export function formatarDataIso(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function ehPeriodoHoje(de: string, ate: string, hoje = new Date()) {
  const hojeIso = dataLocalISO(hoje);
  return de === hojeIso && ate === hojeIso;
}

export function tituloVendasPeriodo(de: string, ate: string, hoje = new Date()) {
  if (ehPeriodoHoje(de, ate, hoje)) return "Vendas de hoje";
  return `Vendas de ${formatarDataIso(de)} até ${formatarDataIso(ate)}`;
}
