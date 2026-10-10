/** Fuso da loja. O Brasil não usa horário de verão. Feriados NÃO são considerados. */
export const FUSO_COMERCIAL = "America/Sao_Paulo";

const INICIO_KEEPALIVE_MIN = 7 * 60 + 56;
const FECHA_SEMANA_MIN = 18 * 60;
const FECHA_SABADO_MIN = 14 * 60;
const ABRE_COMERCIAL_MIN = 8 * 60;

const WEEKDAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export type PartesHorarioSp = {
  weekday: number;
  hour: number;
  minute: number;
};

export function partesSaoPaulo(agora = new Date()): PartesHorarioSp {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_COMERCIAL,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(agora);

  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";

  return {
    weekday: WEEKDAY[valor("weekday")] ?? -1,
    hour: Number(valor("hour")),
    minute: Number(valor("minute")),
  };
}

function minutosDoDia(partes: PartesHorarioSp) {
  return partes.hour * 60 + partes.minute;
}

/** Segunda–sexta 08:00–18:00; sábado 08:00–14:00 (intervalo [início, fim)). */
export function estaNoHorarioComercial(agora = new Date()) {
  const partes = partesSaoPaulo(agora);
  const minutos = minutosDoDia(partes);
  if (partes.weekday === 0) return false;
  if (partes.weekday === 6) {
    return minutos >= ABRE_COMERCIAL_MIN && minutos < FECHA_SABADO_MIN;
  }
  return minutos >= ABRE_COMERCIAL_MIN && minutos < FECHA_SEMANA_MIN;
}

/**
 * Janela do ping: 4 min antes da abertura até o fechamento.
 * Sem–sex 07:56–18:00; sábado 07:56–14:00. Domingo e fora: fechado.
 */
export function estaNaJanelaKeepalive(agora = new Date()) {
  const partes = partesSaoPaulo(agora);
  const minutos = minutosDoDia(partes);
  if (partes.weekday === 0) return false;
  if (partes.weekday === 6) {
    return minutos >= INICIO_KEEPALIVE_MIN && minutos < FECHA_SABADO_MIN;
  }
  return minutos >= INICIO_KEEPALIVE_MIN && minutos < FECHA_SEMANA_MIN;
}
