"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/lib/sessao";
import { abaPorTipo } from "@/lib/produto-tipo";
import {
  montarEan13,
  validarCodigoBarrasInformado,
} from "@/lib/ean13";
import { soDigitos } from "@/lib/documento";
import { ORIGENS_MERCADORIA } from "@/lib/classificacao-fiscal";

export type ProdutoFormState = {
  error?: string;
};

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function inteiro(formData: FormData, campo: string) {
  const valor = Number(texto(formData, campo));
  return Number.isInteger(valor) ? valor : null;
}

function decimal(formData: FormData, campo: string) {
  const bruto = texto(formData, campo).replace(",", ".");
  if (!bruto) return null;
  const valor = Number(bruto);
  return Number.isFinite(valor) ? valor : NaN;
}

function erroUnico(erro: unknown) {
  return (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro &&
    erro.code === "P2002"
  );
}

function alvoUnico(erro: unknown) {
  if (
    typeof erro === "object" &&
    erro !== null &&
    "meta" in erro &&
    typeof erro.meta === "object" &&
    erro.meta !== null &&
    "target" in erro.meta
  ) {
    return String(erro.meta.target);
  }
  return "";
}

function mensagemErroUnico(erro: unknown) {
  const alvo = alvoUnico(erro);
  if (alvo.includes("codigo_barras")) {
    return "Já existe um produto com este código de barras.";
  }
  return "Já existe um produto com este código.";
}

async function gerarCodigoBarrasLivre(inicio?: number) {
  const maximo = await prisma.produto.aggregate({ _max: { id: true } });
  let sequencial = inicio ?? (maximo._max.id ?? 0) + 1;

  for (let tentativa = 0; tentativa < 1000; tentativa += 1, sequencial += 1) {
    const candidato = montarEan13(sequencial);
    const existente = await prisma.produto.findUnique({
      where: { codigo_barras: candidato },
      select: { id: true },
    });
    if (!existente) return { codigo_barras: candidato, sequencial };
  }

  return null;
}

async function resolverCodigoBarras(
  informado: string,
  atual?: string | null,
) {
  if (informado) {
    if (!validarCodigoBarrasInformado(informado)) {
      return {
        error: "O código de barras deve ter exatamente 13 dígitos numéricos.",
      } as const;
    }
    return { codigo_barras: informado, automatico: false } as const;
  }
  if (atual) {
    return { codigo_barras: atual.trim(), automatico: false } as const;
  }
  const gerado = await gerarCodigoBarrasLivre();
  if (!gerado) {
    return { error: "Não foi possível gerar um código de barras livre." } as const;
  }
  return {
    codigo_barras: gerado.codigo_barras,
    automatico: true,
    sequencial: gerado.sequencial,
  } as const;
}

async function lerDadosProduto(
  formData: FormData,
  codigoBarrasAtual?: string | null,
) {
  const nome = texto(formData, "nome");
  const codigoBruto = texto(formData, "codigo");
  const codigoBarrasInformado = texto(formData, "codigo_barras");
  const categoria_id = inteiro(formData, "categoria_id");
  const unidade_medida_id = inteiro(formData, "unidade_medida_id");
  const preco_venda = decimal(formData, "preco_venda");
  const estoque_minimo = decimal(formData, "estoque_minimo") ?? 0;
  const estoque_ideal = decimal(formData, "estoque_ideal") ?? 0;
  const estoque_maximo = decimal(formData, "estoque_maximo") ?? 0;
  const estoque_atual = decimal(formData, "estoque_atual") ?? 0;
  const controla_estoque = formData.get("controla_estoque") === "on";
  const vendido_por_peso = formData.get("vendido_por_peso") === "on";
  const diasValidadeBruto = texto(formData, "dias_validade");
  let dias_validade: number | null = null;
  if (diasValidadeBruto) {
    const valor = Number(diasValidadeBruto);
    if (!Number.isInteger(valor) || valor < 0) {
      return {
        error: "Informe os dias de validade como um número inteiro (0 ou mais).",
      } as const;
    }
    dias_validade = valor;
  }
  const permite_venda_pacote =
    formData.get("permite_venda_pacote") === "on";
  const quantidade_por_pacote = decimal(formData, "quantidade_por_pacote");
  const preco_pacote = decimal(formData, "preco_pacote");
  const ingredientes = texto(formData, "ingredientes");
  const contem_alergenicos = texto(formData, "contem_alergenicos");
  const pode_conter_tracos = texto(formData, "pode_conter_tracos");
  const pesoAproxBruto = texto(formData, "peso_aproximado_g");

  if (!nome) return { error: "Informe o nome do produto." } as const;
  if (!categoria_id) return { error: "Selecione a categoria." } as const;
  if (!unidade_medida_id) {
    return { error: "Selecione a unidade de medida." } as const;
  }
  if (Number.isNaN(preco_venda)) {
    return { error: "Preço de venda inválido." } as const;
  }
  if (
    Number.isNaN(estoque_minimo) ||
    Number.isNaN(estoque_ideal) ||
    Number.isNaN(estoque_maximo) ||
    Number.isNaN(estoque_atual)
  ) {
    return { error: "Informe quantidades de estoque válidas." } as const;
  }
  if (estoque_minimo > estoque_ideal || estoque_ideal > estoque_maximo) {
    return {
      error:
        "O estoque mínimo deve ser menor ou igual ao estoque ideal, e o estoque ideal menor ou igual ao estoque máximo.",
    } as const;
  }

  let quantidadePacote = 1;
  let precoPacote: number | null = null;
  if (permite_venda_pacote) {
    if (
      quantidade_por_pacote == null ||
      Number.isNaN(quantidade_por_pacote) ||
      quantidade_por_pacote <= 1
    ) {
      return {
        error: "Informe a quantidade por pacote (maior que 1).",
      } as const;
    }
    if (preco_pacote == null || Number.isNaN(preco_pacote)) {
      return { error: "Informe o preço do pacote." } as const;
    }
    quantidadePacote = quantidade_por_pacote;
    precoPacote = preco_pacote;
  }

  let peso_aproximado_g: number | null = null;
  if (!vendido_por_peso && pesoAproxBruto) {
    const peso = decimal(formData, "peso_aproximado_g");
    if (peso == null || Number.isNaN(peso) || peso <= 0) {
      return { error: "Informe um peso aproximado válido, em gramas." } as const;
    }
    peso_aproximado_g = peso;
  }

  if (ingredientes.length > 2000) {
    return { error: "Os ingredientes devem ter no máximo 2000 caracteres." } as const;
  }
  if (contem_alergenicos.length > 500) {
    return {
      error: "A declaração de alergênicos deve ter no máximo 500 caracteres.",
    } as const;
  }
  if (pode_conter_tracos.length > 500) {
    return {
      error: "A declaração de traços deve ter no máximo 500 caracteres.",
    } as const;
  }

  const ncmBruto = soDigitos(texto(formData, "ncm"));
  let ncm: string | null = null;
  if (ncmBruto) {
    if (ncmBruto.length !== 8) {
      return { error: "O NCM deve ter 8 dígitos." } as const;
    }
    ncm = ncmBruto;
  }

  const cfopBruto = soDigitos(texto(formData, "cfop_padrao"));
  let cfop_padrao: string | null = null;
  if (cfopBruto) {
    if (cfopBruto.length !== 4) {
      return { error: "O CFOP padrão deve ter 4 dígitos." } as const;
    }
    cfop_padrao = cfopBruto;
  }

  const origemBruta = texto(formData, "origem_mercadoria");
  let origem_mercadoria: string | null = null;
  if (origemBruta) {
    if (!ORIGENS_MERCADORIA.some((origem) => origem.valor === origemBruta)) {
      return { error: "Origem da mercadoria inválida." } as const;
    }
    origem_mercadoria = origemBruta;
  }

  const cstBruto = soDigitos(texto(formData, "cst_csosn"));
  let cst_csosn: string | null = null;
  if (cstBruto) {
    if (cstBruto.length < 2 || cstBruto.length > 4) {
      return { error: "O CST/CSOSN deve ter entre 2 e 4 dígitos." } as const;
    }
    cst_csosn = cstBruto;
  }

  const aliquota_icms = decimal(formData, "aliquota_icms");
  const aliquota_ipi = decimal(formData, "aliquota_ipi");
  const aliquota_pis = decimal(formData, "aliquota_pis");
  const aliquota_cofins = decimal(formData, "aliquota_cofins");
  const aliquotas = [
    ["ICMS", aliquota_icms],
    ["IPI", aliquota_ipi],
    ["PIS", aliquota_pis],
    ["COFINS", aliquota_cofins],
  ] as const;
  for (const [nomeAliquota, valor] of aliquotas) {
    if (valor == null) continue;
    if (Number.isNaN(valor) || valor < 0 || valor > 100) {
      return {
        error: `A alíquota de ${nomeAliquota} deve estar entre 0 e 100.`,
      } as const;
    }
  }

  const codigoBarras = await resolverCodigoBarras(
    codigoBarrasInformado,
    codigoBarrasAtual,
  );
  if ("error" in codigoBarras) return { error: codigoBarras.error };

  const [categoria, unidade] = await Promise.all([
    prisma.categoria_produto.findUnique({ where: { id: categoria_id } }),
    prisma.unidade_medida.findUnique({ where: { id: unidade_medida_id } }),
  ]);

  if (!categoria) return { error: "Categoria inválida." } as const;
  if (!unidade) return { error: "Unidade de medida inválida." } as const;

  return {
    data: {
      nome,
      codigo: codigoBruto || null,
      codigo_barras: codigoBarras.codigo_barras,
      categoria_id,
      tipo: categoria.tipo,
      unidade_medida_id,
      preco_venda,
      estoque_minimo,
      estoque_ideal,
      estoque_maximo,
      estoque_atual,
      controla_estoque,
      vendido_por_peso,
      dias_validade,
      peso_aproximado_g,
      ingredientes: ingredientes || null,
      contem_alergenicos: contem_alergenicos || null,
      pode_conter_tracos: pode_conter_tracos || null,
      permite_venda_pacote,
      quantidade_por_pacote: quantidadePacote,
      preco_pacote: precoPacote,
      ncm,
      cfop_padrao,
      origem_mercadoria,
      cst_csosn,
      aliquota_icms,
      aliquota_ipi,
      aliquota_pis,
      aliquota_cofins,
    },
    automatico: codigoBarras.automatico,
    sequencial: "sequencial" in codigoBarras ? codigoBarras.sequencial : undefined,
  } as const;
}

export async function criarProduto(
  _estado: ProdutoFormState,
  formData: FormData,
): Promise<ProdutoFormState> {
  await exigirModulo("produtos");
  const resultado = await lerDadosProduto(formData);
  if ("error" in resultado) return { error: resultado.error };

  let { data } = resultado;
  let sequencial = resultado.sequencial;
  let criado = false;

  for (let tentativa = 0; tentativa < 20; tentativa += 1) {
    try {
      await prisma.produto.create({ data });
      criado = true;
      break;
    } catch (erro) {
      if (
        resultado.automatico &&
        erroUnico(erro) &&
        alvoUnico(erro).includes("codigo_barras")
      ) {
        const proximo = await gerarCodigoBarrasLivre((sequencial ?? 0) + 1);
        if (!proximo) {
          return { error: "Não foi possível gerar um código de barras livre." };
        }
        data = { ...data, codigo_barras: proximo.codigo_barras };
        sequencial = proximo.sequencial;
        continue;
      }
      if (erroUnico(erro)) {
        return { error: mensagemErroUnico(erro) };
      }
      return { error: "Não foi possível cadastrar o produto." };
    }
  }

  if (!criado) {
    return { error: "Não foi possível gerar um código de barras livre." };
  }

  revalidatePath("/produtos");
  redirect(`/produtos?aba=${abaPorTipo(data.tipo)}`);
}

export async function atualizarProduto(
  id: number,
  _estado: ProdutoFormState,
  formData: FormData,
): Promise<ProdutoFormState> {
  await exigirModulo("produtos");
  const produtoAtual = await prisma.produto.findUnique({
    where: { id },
    select: { codigo_barras: true },
  });
  const resultado = await lerDadosProduto(
    formData,
    produtoAtual?.codigo_barras,
  );
  if ("error" in resultado) return { error: resultado.error };

  try {
    await prisma.produto.update({
      where: { id },
      data: resultado.data,
    });
  } catch (erro) {
    if (erroUnico(erro)) {
      return { error: mensagemErroUnico(erro) };
    }
    return { error: "Não foi possível atualizar o produto." };
  }

  revalidatePath("/produtos");
  redirect(`/produtos?aba=${abaPorTipo(resultado.data.tipo)}`);
}

export async function inativarProduto(id: number) {
  await exigirModulo("produtos");
  await prisma.produto.update({
    where: { id },
    data: { ativo: false },
  });
  revalidatePath("/produtos");
}
