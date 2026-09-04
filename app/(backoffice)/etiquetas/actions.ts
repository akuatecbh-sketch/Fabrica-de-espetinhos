"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { filtroBuscaProduto } from "@/lib/busca-produto";
import {
  calcularPrecoPorPeso,
  parseDecimalBr,
} from "@/lib/etiquetas";
import { dataUtcMeiaNoite, ehIsoData } from "@/lib/financeiro";
import { TIPOS_VENDA } from "@/lib/produto-tipo";
import { exigirModulo } from "@/lib/sessao";

export type ProdutoEtiquetaBusca = {
  id: number;
  nome: string;
  codigo: string | null;
  codigo_barras: string | null;
  dias_validade: number | null;
  vendido_por_peso: boolean;
  preco_venda: string | null;
  peso_aproximado_g: string | null;
  ingredientes: string | null;
  contem_alergenicos: string | null;
  pode_conter_tracos: string | null;
};

export async function buscarProdutosEtiqueta(
  termo: string,
): Promise<ProdutoEtiquetaBusca[]> {
  await exigirModulo("etiquetas");
  const where = filtroBuscaProduto(termo, TIPOS_VENDA);
  if (!where) return [];

  const produtos = await prisma.produto.findMany({
    where,
    orderBy: { nome: "asc" },
    take: 20,
    select: {
      id: true,
      nome: true,
      codigo: true,
      codigo_barras: true,
      dias_validade: true,
      vendido_por_peso: true,
      preco_venda: true,
      peso_aproximado_g: true,
      ingredientes: true,
      contem_alergenicos: true,
      pode_conter_tracos: true,
    },
  });

  return produtos.map((produto) => ({
    id: produto.id,
    nome: produto.nome,
    codigo: produto.codigo,
    codigo_barras: produto.codigo_barras,
    dias_validade: produto.dias_validade,
    vendido_por_peso: produto.vendido_por_peso,
    preco_venda: produto.preco_venda?.toString() ?? null,
    peso_aproximado_g: produto.peso_aproximado_g?.toString() ?? null,
    ingredientes: produto.ingredientes,
    contem_alergenicos: produto.contem_alergenicos,
    pode_conter_tracos: produto.pode_conter_tracos,
  }));
}

export type EtiquetaFormState = {
  error?: string;
};

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

export async function gerarEtiquetas(
  _estado: EtiquetaFormState,
  formData: FormData,
): Promise<EtiquetaFormState> {
  const usuario = await exigirModulo("etiquetas");
  const produtoId = Number(texto(formData, "produto_id"));
  const modeloId = Number(texto(formData, "modelo_etiqueta_id"));
  const quantidade = Number(texto(formData, "quantidade"));
  const lote = texto(formData, "lote");
  const fabricacaoIso = texto(formData, "data_fabricacao");
  const acondicionamentoIso = texto(formData, "data_acondicionamento");
  const validadeIso = texto(formData, "data_validade");
  const pesoBruto = texto(formData, "peso_kg");

  if (!Number.isInteger(produtoId) || produtoId <= 0) {
    return { error: "Selecione um produto." };
  }
  if (!Number.isInteger(modeloId) || modeloId <= 0) {
    return { error: "Selecione o modelo de etiqueta." };
  }
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    return { error: "Informe a quantidade de etiquetas (mínimo 1)." };
  }
  if (quantidade > 200) {
    return { error: "Informe no máximo 200 etiquetas por vez." };
  }
  if (!lote) return { error: "Informe o lote." };
  if (lote.length > 80) {
    return { error: "O lote deve ter no máximo 80 caracteres." };
  }
  if (!ehIsoData(fabricacaoIso)) {
    return { error: "Informe a data de fabricação." };
  }
  if (!ehIsoData(acondicionamentoIso)) {
    return { error: "Informe a data de acondicionamento." };
  }
  if (validadeIso && !ehIsoData(validadeIso)) {
    return { error: "Data de validade inválida." };
  }

  const [produto, modelo] = await Promise.all([
    prisma.produto.findFirst({
      where: {
        id: produtoId,
        ativo: true,
        tipo: { in: [...TIPOS_VENDA] },
      },
      select: {
        id: true,
        vendido_por_peso: true,
        preco_venda: true,
      },
    }),
    prisma.modelo_etiqueta.findFirst({
      where: { id: modeloId, ativo: true },
      select: { id: true },
    }),
  ]);
  if (!produto) return { error: "Produto inválido." };
  if (!modelo) return { error: "Modelo de etiqueta inválido." };

  const precoVenda = produto.preco_venda
    ? Number(produto.preco_venda.toString())
    : null;
  if (precoVenda == null || Number.isNaN(precoVenda)) {
    return { error: "O produto não tem preço de venda cadastrado." };
  }

  let pesoKg: number | null = null;
  let precoCalculado = precoVenda;

  if (produto.vendido_por_peso) {
    const peso = parseDecimalBr(pesoBruto);
    if (peso == null || Number.isNaN(peso) || peso <= 0) {
      return { error: "Informe o peso do pacote em kg." };
    }
    pesoKg = peso;
    precoCalculado = calcularPrecoPorPeso(peso, precoVenda);
  }

  const registro = await prisma.etiqueta_impressao.create({
    data: {
      produto_id: produto.id,
      modelo_etiqueta_id: modelo.id,
      lote,
      quantidade_etiquetas: quantidade,
      data_fabricacao: dataUtcMeiaNoite(fabricacaoIso),
      data_acondicionamento: dataUtcMeiaNoite(acondicionamentoIso),
      data_validade: validadeIso ? dataUtcMeiaNoite(validadeIso) : null,
      peso_kg: pesoKg,
      preco_calculado: precoCalculado,
      usuario_id: usuario.id,
    },
  });

  revalidatePath("/etiquetas");
  redirect(`/etiquetas?impressao=${registro.id}`);
}
