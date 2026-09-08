export const ORIGENS_MERCADORIA = [
  { valor: "0", rotulo: "0 — Nacional" },
  { valor: "1", rotulo: "1 — Estrangeira (importação direta)" },
  { valor: "2", rotulo: "2 — Estrangeira (mercado interno)" },
  { valor: "3", rotulo: "3 — Nacional (conteúdo de importação 40% a 70%)" },
  { valor: "4", rotulo: "4 — Nacional (processo produtivo básico)" },
  { valor: "5", rotulo: "5 — Nacional (conteúdo de importação até 40%)" },
  { valor: "6", rotulo: "6 — Estrangeira (importação direta, sem similar nacional)" },
  { valor: "7", rotulo: "7 — Estrangeira (mercado interno, sem similar nacional)" },
  { valor: "8", rotulo: "8 — Nacional (conteúdo de importação acima de 70%)" },
] as const;

export function produtoSemDadosFiscais(produto: { ncm?: string | null }) {
  return !produto.ncm?.trim();
}

function textoFiscal(valor?: string | null) {
  return Boolean(valor?.trim());
}

function aliquotaInformada(valor: unknown) {
  if (valor == null || valor === "") return false;
  return Number.isFinite(Number(valor));
}

export type CamposClassificacaoFiscal = {
  ncm?: string | null;
  cfop_padrao?: string | null;
  origem_mercadoria?: string | null;
  cst_csosn?: string | null;
  aliquota_icms?: unknown;
  aliquota_ipi?: unknown;
  aliquota_pis?: unknown;
  aliquota_cofins?: unknown;
};

export function classificacaoFiscalCompleta(produto: CamposClassificacaoFiscal) {
  return (
    textoFiscal(produto.ncm) &&
    textoFiscal(produto.cfop_padrao) &&
    textoFiscal(produto.origem_mercadoria) &&
    textoFiscal(produto.cst_csosn) &&
    aliquotaInformada(produto.aliquota_icms) &&
    aliquotaInformada(produto.aliquota_ipi) &&
    aliquotaInformada(produto.aliquota_pis) &&
    aliquotaInformada(produto.aliquota_cofins)
  );
}

export function mensagemProdutosSemClassificacaoFiscal(nomes: string[]) {
  const lista = nomes.join(", ");
  return `Não é possível emitir a NF-e. Preencha a classificação fiscal (NCM, CFOP, origem, CST/CSOSN e alíquotas) destes produtos: ${lista}.`;
}
