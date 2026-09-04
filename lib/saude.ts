export function rotuloStatusSaude(status: string) {
  const mapa: Record<string, string> = {
    ok: "Ok",
    atencao: "Atenção",
    aviso: "Atenção",
    erro: "Erro",
  };
  return mapa[status] ?? status;
}

export function classesStatusSaude(status: string) {
  if (status === "erro") {
    return "rounded bg-vermelho-erro/10 px-2 py-0.5 text-xs font-medium text-vermelho-erro";
  }
  if (status === "atencao" || status === "aviso") {
    return "rounded bg-ambar/10 px-2 py-0.5 text-xs font-medium text-ambar";
  }
  return "rounded bg-verde-sucesso/10 px-2 py-0.5 text-xs font-medium text-verde-sucesso";
}

export function classesCardStatusSaude(status: string) {
  if (status === "erro") {
    return "border-vermelho-erro/40 bg-vermelho-erro/10";
  }
  if (status === "atencao") {
    return "border-zinc-200 bg-ambar/10";
  }
  return "border-verde-sucesso/40 bg-verde-sucesso/10";
}

export function rotuloCategoriaSaude(categoria: string) {
  if (categoria === "fluxo_sintetico") return "Fluxo sintético";
  if (categoria === "integridade") return "Integridade";
  return categoria;
}

export function horasDesde(data: Date) {
  return (Date.now() - data.getTime()) / 36e5;
}
