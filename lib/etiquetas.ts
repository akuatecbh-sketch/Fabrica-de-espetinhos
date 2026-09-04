export const ETIQUETA_LARGURA_MM = 50;
export const ETIQUETA_ALTURA_MM = 30;

export const TIPO_TERMICA = "termica_rolo";
export const TIPO_FOLHA_A4 = "folha_a4";

export type ModeloEtiqueta = {
  id: number;
  nome: string;
  tipo: string;
  largura_mm: number;
  altura_mm: number;
  colunas_por_folha: number;
  linhas_por_folha: number;
  margem_superior_mm: number;
  margem_esquerda_mm: number;
  espaco_horizontal_mm: number;
  espaco_vertical_mm: number;
};

function numeroDeDecimal(valor: { toString(): string } | number) {
  return typeof valor === "number" ? valor : Number(valor.toString());
}

export function serializarModelo(modelo: {
  id: number;
  nome: string;
  tipo: string;
  largura_mm: { toString(): string } | number;
  altura_mm: { toString(): string } | number;
  colunas_por_folha: number;
  linhas_por_folha: number;
  margem_superior_mm: { toString(): string } | number;
  margem_esquerda_mm: { toString(): string } | number;
  espaco_horizontal_mm: { toString(): string } | number;
  espaco_vertical_mm: { toString(): string } | number;
}): ModeloEtiqueta {
  return {
    id: modelo.id,
    nome: modelo.nome,
    tipo: modelo.tipo,
    largura_mm: numeroDeDecimal(modelo.largura_mm),
    altura_mm: numeroDeDecimal(modelo.altura_mm),
    colunas_por_folha: modelo.colunas_por_folha,
    linhas_por_folha: modelo.linhas_por_folha,
    margem_superior_mm: numeroDeDecimal(modelo.margem_superior_mm),
    margem_esquerda_mm: numeroDeDecimal(modelo.margem_esquerda_mm),
    espaco_horizontal_mm: numeroDeDecimal(modelo.espaco_horizontal_mm),
    espaco_vertical_mm: numeroDeDecimal(modelo.espaco_vertical_mm),
  };
}

export function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function loteSugerido(produtoId: number, fabricacaoIso?: string) {
  const iso = (fabricacaoIso ?? dataLocalISO()).replaceAll("-", "");
  return `${iso}-${produtoId}`;
}

export function somarDiasIso(iso: string, dias: number) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  data.setDate(data.getDate() + dias);
  return dataLocalISO(data);
}

export function formatarDataIso(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

export function isoDeDateUtc(data: Date) {
  return data.toISOString().slice(0, 10);
}

export function parseDecimalBr(valor: string) {
  const bruto = valor.trim().replace(/\s/g, "").replace(",", ".");
  if (!bruto) return null;
  const numero = Number(bruto);
  return Number.isFinite(numero) ? numero : NaN;
}

export function arredondarPreco(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function calcularPrecoPorPeso(pesoKg: number, precoPorKg: number) {
  return arredondarPreco(pesoKg * precoPorKg);
}

export function formatarPesoKg(valor: { toString(): string } | number | null) {
  if (valor == null) return "—";
  const numero = numeroDeDecimal(valor);
  if (Number.isNaN(numero)) return "—";
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(numero)} kg`;
}

export function etiquetasPorFolha(modelo: ModeloEtiqueta) {
  return Math.max(1, modelo.colunas_por_folha * modelo.linhas_por_folha);
}

export function ehFolhaA4(modelo: ModeloEtiqueta) {
  return modelo.tipo === TIPO_FOLHA_A4;
}

export function etiquetaComportaRotuloCompleto(modelo: ModeloEtiqueta) {
  const area = modelo.largura_mm * modelo.altura_mm;
  const maiorLado = Math.max(modelo.largura_mm, modelo.altura_mm);
  return maiorLado >= 90 || area >= 2400;
}

export type TextosRotulo = {
  pesoAproximadoG: string | null;
  ingredientes: string | null;
  contemAlergenicos: string | null;
  podeConterTracos: string | null;
};

export function temTextosRotuloExtra(textos: TextosRotulo) {
  return Boolean(
    textos.pesoAproximadoG ||
      textos.ingredientes ||
      textos.contemAlergenicos ||
      textos.podeConterTracos,
  );
}

export function avisoRotuloCompacto(
  modelo: ModeloEtiqueta,
  textos: TextosRotulo,
) {
  if (etiquetaComportaRotuloCompleto(modelo)) return null;
  if (!temTextosRotuloExtra(textos)) return null;
  return "Ingredientes, alergênicos e peso aproximado não cabem neste modelo. Use um formato maior (ex.: Pimaco 6081) para imprimir o rótulo completo.";
}

export type EmpresaRotulo = {
  razaoSocial: string;
  nomeFantasia: string | null;
  logoUrl: string | null;
};

export type EtiquetaPreview = {
  quantidade: number;
  lote: string;
  fabricacaoIso: string;
  acondicionamentoIso: string;
  validadeIso: string | null;
  vendidoPorPeso: boolean;
  pesoKg: string | null;
  precoPorKg: string | null;
  precoCalculado: string | null;
  produto: {
    nome: string;
    codigo_barras: string | null;
    pesoAproximadoG: string | null;
    ingredientes: string | null;
    contemAlergenicos: string | null;
    podeConterTracos: string | null;
  };
  empresa: EmpresaRotulo | null;
  modelo: ModeloEtiqueta;
};

export function previewDeRegistro(
  registro: {
    quantidade_etiquetas: number;
    lote: string;
    data_fabricacao: Date;
    data_acondicionamento: Date;
    data_validade: Date | null;
    peso_kg: { toString(): string } | null;
    preco_calculado: { toString(): string } | null;
    produto: {
      nome: string;
      codigo_barras: string | null;
      preco_venda: { toString(): string } | null;
      vendido_por_peso: boolean;
      peso_aproximado_g?: { toString(): string } | null;
      ingredientes?: string | null;
      contem_alergenicos?: string | null;
      pode_conter_tracos?: string | null;
    };
    modelo_etiqueta: {
      id: number;
      nome: string;
      tipo: string;
      largura_mm: { toString(): string } | number;
      altura_mm: { toString(): string } | number;
      colunas_por_folha: number;
      linhas_por_folha: number;
      margem_superior_mm: { toString(): string } | number;
      margem_esquerda_mm: { toString(): string } | number;
      espaco_horizontal_mm: { toString(): string } | number;
      espaco_vertical_mm: { toString(): string } | number;
    };
  },
  empresa?: {
    razao_social: string;
    nome_fantasia: string | null;
    logo_url: string | null;
  } | null,
): EtiquetaPreview {
  const vendidoPorPeso = registro.produto.vendido_por_peso;
  return {
    quantidade: registro.quantidade_etiquetas,
    lote: registro.lote,
    fabricacaoIso: isoDeDateUtc(registro.data_fabricacao),
    acondicionamentoIso: isoDeDateUtc(registro.data_acondicionamento),
    validadeIso: registro.data_validade
      ? isoDeDateUtc(registro.data_validade)
      : null,
    vendidoPorPeso,
    pesoKg: registro.peso_kg?.toString() ?? null,
    precoPorKg: vendidoPorPeso
      ? (registro.produto.preco_venda?.toString() ?? null)
      : null,
    precoCalculado: registro.preco_calculado?.toString() ?? null,
    produto: {
      nome: registro.produto.nome,
      codigo_barras: registro.produto.codigo_barras,
      pesoAproximadoG:
        !vendidoPorPeso && registro.produto.peso_aproximado_g != null
          ? registro.produto.peso_aproximado_g.toString()
          : null,
      ingredientes: registro.produto.ingredientes?.trim() || null,
      contemAlergenicos: registro.produto.contem_alergenicos?.trim() || null,
      podeConterTracos: registro.produto.pode_conter_tracos?.trim() || null,
    },
    empresa: empresa
      ? {
          razaoSocial: empresa.razao_social,
          nomeFantasia: empresa.nome_fantasia,
          logoUrl: empresa.logo_url,
        }
      : null,
    modelo: serializarModelo(registro.modelo_etiqueta),
  };
}
