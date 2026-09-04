import { classesBadgeStatus } from "@/lib/financeiro";

export const DIAS_FERIAS_ANO = 30;
export const ALERTA_FERIAS_DIAS = 60;

export const STATUS_FERIAS = [
  "pendente",
  "programada",
  "gozada",
  "vencida",
] as const;
export type StatusFerias = (typeof STATUS_FERIAS)[number];

export function rotuloStatusFerias(status: string) {
  const mapa: Record<string, string> = {
    pendente: "Pendente",
    programada: "Programada",
    gozada: "Gozada",
    vencida: "Vencida",
  };
  return mapa[status] ?? status;
}

export function classesStatusFerias(status: string) {
  if (status === "gozada") {
    return "rounded bg-verde-sucesso/10 px-2 py-0.5 text-xs font-medium text-verde-sucesso";
  }
  if (status === "vencida") {
    return "rounded bg-vermelho-erro/10 px-2 py-0.5 text-xs font-medium text-vermelho-erro";
  }
  if (status === "programada") {
    return "rounded bg-azul-bg px-2 py-0.5 text-xs font-medium text-azul-texto";
  }
  return "rounded bg-ambar/10 px-2 py-0.5 text-xs font-medium text-ambar";
}

export function aniversarioNoMes(nascimento: Date, agora = new Date()) {
  return nascimento.getUTCMonth() === agora.getMonth();
}

export function adicionarDiasUtc(data: Date, dias: number) {
  const resultado = new Date(data);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado;
}

export function adicionarAnosUtc(data: Date, anos: number) {
  const resultado = new Date(data);
  resultado.setUTCFullYear(resultado.getUTCFullYear() + anos);
  return resultado;
}

export function calcularFimProgramado(inicio: Date, diasGozados: number) {
  return adicionarDiasUtc(inicio, Math.max(1, diasGozados) - 1);
}

export function dadosPrimeiroPeriodo(dataAdmissao: Date) {
  return {
    periodo_aquisitivo_inicio: dataAdmissao,
    periodo_aquisitivo_fim: adicionarAnosUtc(dataAdmissao, 1),
    status: "pendente" as const,
  };
}

export function dadosProximoPeriodo(fimAnterior: Date) {
  const inicio = adicionarDiasUtc(fimAnterior, 1);
  return {
    periodo_aquisitivo_inicio: inicio,
    periodo_aquisitivo_fim: adicionarAnosUtc(inicio, 1),
    status: "pendente" as const,
  };
}

export function limiteAlertaFerias(hoje: Date) {
  return adicionarDiasUtc(hoje, ALERTA_FERIAS_DIAS);
}

export function feriasComPrazoApertado(
  status: string,
  periodoFim: Date,
  hoje: Date,
) {
  if (status !== "pendente") return false;
  return periodoFim.getTime() <= limiteAlertaFerias(hoje).getTime();
}

export function feriasPrazoVencido(periodoFim: Date, hoje: Date) {
  return periodoFim.getTime() < hoje.getTime();
}

export function classesAlertaFerias(periodoFim: Date, hoje: Date) {
  return classesBadgeStatus("aberta", feriasPrazoVencido(periodoFim, hoje));
}

export function rotuloAlertaFerias(periodoFim: Date, hoje: Date) {
  return feriasPrazoVencido(periodoFim, hoje)
    ? "Prazo vencido"
    : "Prazo se esgotando";
}
