import { describe, expect, it } from "vitest";

function inicioLocalMaisDias(dias: number, agora: Date) {
  const data = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  data.setDate(data.getDate() + dias);
  return data;
}

function dataLocalISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Agrupamento antigo (e3cfb41): chave = data local do Date. */
function agruparAntigo(
  pagamentos: { quando: Date; valor: number; liquido: number }[],
  agora: Date,
) {
  const inicio = inicioLocalMaisDias(-6, agora);
  const fim = inicioLocalMaisDias(1, agora);
  const porDia = new Map<string, { bruto: number; liquido: number }>();
  for (const linha of pagamentos) {
    if (linha.quando < inicio || linha.quando >= fim) continue;
    const chave = dataLocalISO(linha.quando);
    const atual = porDia.get(chave) ?? { bruto: 0, liquido: 0 };
    atual.bruto += linha.valor;
    atual.liquido += linha.liquido;
    porDia.set(chave, atual);
  }
  const pontos: { iso: string; bruto: number; liquido: number }[] = [];
  for (let i = -6; i <= 0; i++) {
    const dia = inicioLocalMaisDias(i, agora);
    const iso = dataLocalISO(dia);
    pontos.push({ iso, ...(porDia.get(iso) ?? { bruto: 0, liquido: 0 }) });
  }
  return pontos;
}

/** Agrupamento novo: CASE [meia-noite local i, meia-noite local i+1). */
function agruparNovo(
  pagamentos: { quando: Date; valor: number; liquido: number }[],
  agora: Date,
) {
  const inicio = inicioLocalMaisDias(-6, agora);
  const fim = inicioLocalMaisDias(1, agora);
  const porIndice = new Map<number, { bruto: number; liquido: number }>();
  for (const linha of pagamentos) {
    if (linha.quando < inicio || linha.quando >= fim) continue;
    for (let i = 0; i < 7; i++) {
      const de = inicioLocalMaisDias(i - 6, agora);
      const ate = inicioLocalMaisDias(i - 5, agora);
      if (linha.quando >= de && linha.quando < ate) {
        const atual = porIndice.get(i) ?? { bruto: 0, liquido: 0 };
        atual.bruto += linha.valor;
        atual.liquido += linha.liquido;
        porIndice.set(i, atual);
        break;
      }
    }
  }
  const pontos: { iso: string; bruto: number; liquido: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const iso = dataLocalISO(inicioLocalMaisDias(i - 6, agora));
    pontos.push({ iso, ...(porIndice.get(i) ?? { bruto: 0, liquido: 0 }) });
  }
  return pontos;
}

describe("dashboard 7d: SQL CASE = agrupamento antigo, fuso local", () => {
  it("venda às 23:30 e 00:30 locais caem no mesmo dia que antes", () => {
    const agora = new Date(2026, 9, 9, 15, 0, 0);
    const ontem2330 = new Date(2026, 9, 8, 23, 30, 0);
    const hoje0030 = new Date(2026, 9, 9, 0, 30, 0);
    const hoje1530 = new Date(2026, 9, 9, 15, 30, 0);
    const pagamentos = [
      { quando: ontem2330, valor: 80, liquido: 80 },
      { quando: hoje0030, valor: 20, liquido: 19 },
      { quando: hoje1530, valor: 50, liquido: 48 },
    ];

    const antigo = agruparAntigo(pagamentos, agora);
    const novo = agruparNovo(pagamentos, agora);
    expect(novo).toEqual(antigo);

    const dia8 = antigo.find((ponto) => ponto.iso === "2026-10-08");
    const dia9 = antigo.find((ponto) => ponto.iso === "2026-10-09");
    expect(dia8).toEqual({ iso: "2026-10-08", bruto: 80, liquido: 80 });
    expect(dia9).toEqual({ iso: "2026-10-09", bruto: 70, liquido: 67 });
  });

  it("não usa UTC: 23:30 local não vira o dia seguinte", () => {
    const agora = new Date(2026, 9, 9, 10, 0, 0);
    const noite = new Date(2026, 9, 9, 23, 30, 0);
    expect(dataLocalISO(noite)).toBe("2026-10-09");
    const antigo = agruparAntigo(
      [{ quando: noite, valor: 10, liquido: 10 }],
      agora,
    );
    const novo = agruparNovo([{ quando: noite, valor: 10, liquido: 10 }], agora);
    expect(novo).toEqual(antigo);
    expect(antigo.find((ponto) => ponto.iso === "2026-10-09")?.bruto).toBe(10);
  });
});
