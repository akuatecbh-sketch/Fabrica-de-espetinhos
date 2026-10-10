import { describe, expect, it } from "vitest";
import {
  estaNaJanelaKeepalive,
  estaNoHorarioComercial,
} from "@/lib/horario-comercial";

/** Instante UTC cuja parede em America/Sao_Paulo é a data/hora pedida (UTC-3, sem DST). */
function sp(ano: number, mes: number, dia: number, hora: number, minuto: number) {
  return new Date(Date.UTC(ano, mes - 1, dia, hora + 3, minuto, 0));
}

describe("horário comercial e janela keepalive (America/Sao_Paulo)", () => {
  it("segunda 08:00: aberto e na janela; 07:55 fora; 07:56 só keepalive", () => {
    expect(estaNoHorarioComercial(sp(2026, 1, 5, 8, 0))).toBe(true);
    expect(estaNaJanelaKeepalive(sp(2026, 1, 5, 8, 0))).toBe(true);
    expect(estaNoHorarioComercial(sp(2026, 1, 5, 7, 55))).toBe(false);
    expect(estaNaJanelaKeepalive(sp(2026, 1, 5, 7, 55))).toBe(false);
    expect(estaNoHorarioComercial(sp(2026, 1, 5, 7, 56))).toBe(false);
    expect(estaNaJanelaKeepalive(sp(2026, 1, 5, 7, 56))).toBe(true);
  });

  it("segunda 17:56 na janela; 18:00 fechado", () => {
    expect(estaNoHorarioComercial(sp(2026, 1, 5, 17, 56))).toBe(true);
    expect(estaNaJanelaKeepalive(sp(2026, 1, 5, 17, 56))).toBe(true);
    expect(estaNoHorarioComercial(sp(2026, 1, 5, 18, 0))).toBe(false);
    expect(estaNaJanelaKeepalive(sp(2026, 1, 5, 18, 0))).toBe(false);
  });

  it("sábado 13:56 na janela; 14:00 fechado", () => {
    expect(estaNoHorarioComercial(sp(2026, 1, 10, 13, 56))).toBe(true);
    expect(estaNaJanelaKeepalive(sp(2026, 1, 10, 13, 56))).toBe(true);
    expect(estaNoHorarioComercial(sp(2026, 1, 10, 14, 0))).toBe(false);
    expect(estaNaJanelaKeepalive(sp(2026, 1, 10, 14, 0))).toBe(false);
    expect(estaNaJanelaKeepalive(sp(2026, 1, 10, 7, 56))).toBe(true);
  });

  it("domingo: nenhum ping", () => {
    expect(estaNoHorarioComercial(sp(2026, 1, 11, 10, 0))).toBe(false);
    expect(estaNaJanelaKeepalive(sp(2026, 1, 11, 7, 56))).toBe(false);
    expect(estaNaJanelaKeepalive(sp(2026, 1, 11, 12, 0))).toBe(false);
  });

  it("virada de dia UTC não desloca a janela de Brasília", () => {
    // Segunda 00:00 UTC = domingo 21:00 em SP
    const utcSegundaMeiaNoite = new Date(Date.UTC(2026, 0, 5, 0, 0, 0));
    expect(utcSegundaMeiaNoite.getUTCDay()).toBe(1);
    expect(estaNaJanelaKeepalive(utcSegundaMeiaNoite)).toBe(false);

    // Segunda 10:56 UTC = 07:56 SP (primeiro ping)
    const utcAbertura = new Date(Date.UTC(2026, 0, 5, 10, 56, 0));
    expect(estaNaJanelaKeepalive(utcAbertura)).toBe(true);

    // Terça 00:00 UTC = segunda 21:00 SP (já fechado)
    const utcTercaMeiaNoite = new Date(Date.UTC(2026, 0, 6, 0, 0, 0));
    expect(estaNaJanelaKeepalive(utcTercaMeiaNoite)).toBe(false);
  });
});
