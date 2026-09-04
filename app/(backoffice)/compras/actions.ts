"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  soDigitos,
  validarCnpjCpf,
} from "@/lib/documento";
import {
  arredondarCusto,
  arredondarDinheiro,
  arredondarQuantidade,
} from "@/lib/dinheiro";
import {
  aplicarConfirmacaoEntrada,
  reverterNotaConferida,
} from "@/lib/compras-servidor";
import { totaisDaNota } from "@/lib/compras";
import { dataLocalISO, dataUtcMeiaNoite, ehIsoData } from "@/lib/financeiro";
import { filtroBuscaProduto } from "@/lib/busca-produto";
import { TIPOS_INSUMO } from "@/lib/produto-tipo";
import { exigirCompras } from "@/lib/sessao";

export type CompraFormState = {
  error?: string;
};

export type FornecedorOpcao = {
  id: number;
  razao_social: string;
  nome_fantasia: string | null;
};

export type ProdutoCompraBusca = {
  id: number;
  nome: string;
  tipo: string;
  unidade: string;
  codigo: string | null;
  codigo_barras: string | null;
};

export async function buscarProdutosCompra(
  termo: string,
): Promise<ProdutoCompraBusca[]> {
  await exigirCompras();
  const where = filtroBuscaProduto(termo, TIPOS_INSUMO);
  if (!where) return [];

  const produtos = await prisma.produto.findMany({
    where,
    include: { unidade_medida: true },
    orderBy: { nome: "asc" },
    take: 20,
  });

  return produtos.map((produto) => ({
    id: produto.id,
    nome: produto.nome,
    tipo: produto.tipo,
    unidade: produto.unidade_medida.sigla,
    codigo: produto.codigo,
    codigo_barras: produto.codigo_barras,
  }));
}

type ItemEntrada = {
  produto_id: number;
  quantidade: number;
  valor_unitario: number;
};

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function lerNumero(formData: FormData, campo: string) {
  const bruto = texto(formData, campo).replace(",", ".");
  if (!bruto) return 0;
  return Number(bruto);
}

function erroUnico(erro: unknown) {
  return (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro &&
    erro.code === "P2002"
  );
}

function revalidar() {
  revalidatePath("/compras", "layout");
  revalidatePath("/financeiro", "layout");
  revalidatePath("/produtos", "layout");
  revalidatePath("/estoque", "layout");
  revalidatePath("/");
}

function lerItens(formData: FormData): { error?: string; itens?: ItemEntrada[] } {
  let bruto: unknown;
  try {
    bruto = JSON.parse(String(formData.get("itens") ?? "[]"));
  } catch {
    return { error: "Itens inválidos." };
  }
  if (!Array.isArray(bruto)) return { error: "Itens inválidos." };

  const itens: ItemEntrada[] = [];
  for (const item of bruto) {
    const produto_id = Number(item?.produto_id);
    const quantidade = Number(item?.quantidade);
    const valor_unitario = Number(item?.valor_unitario);
    if (!Number.isInteger(produto_id)) {
      return { error: "Produto inválido em um dos itens." };
    }
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      return { error: "Informe uma quantidade maior que zero em todos os itens." };
    }
    if (!Number.isFinite(valor_unitario) || valor_unitario < 0) {
      return { error: "Valor unitário inválido em um dos itens." };
    }
    itens.push({
      produto_id,
      quantidade: arredondarQuantidade(quantidade),
      valor_unitario: arredondarCusto(valor_unitario),
    });
  }
  return { itens };
}

export async function criarFornecedorCompra(
  razaoSocialBruta: string,
  cnpjCpfBruto: string,
): Promise<{ error?: string; fornecedor?: FornecedorOpcao }> {
  await exigirCompras();
  const razao_social = razaoSocialBruta.trim();
  const documento = soDigitos(cnpjCpfBruto);

  if (!razao_social) return { error: "Informe a razão social." };
  if (razao_social.length > 150) {
    return { error: "A razão social deve ter no máximo 150 caracteres." };
  }
  if (!documento) return { error: "Informe o CPF ou CNPJ." };
  if (!validarCnpjCpf(documento)) {
    return { error: "CPF/CNPJ inválido." };
  }

  try {
    const fornecedor = await prisma.fornecedor.create({
      data: {
        razao_social,
        cnpj_cpf: documento,
        ativo: true,
      },
      select: { id: true, razao_social: true, nome_fantasia: true },
    });
    revalidatePath("/fornecedores");
    return { fornecedor };
  } catch (erro) {
    if (erroUnico(erro)) {
      return { error: "Já existe um fornecedor com este CPF/CNPJ." };
    }
    throw erro;
  }
}

export async function salvarNotaEntrada(
  _estado: CompraFormState,
  formData: FormData,
): Promise<CompraFormState> {
  const usuario = await exigirCompras();
  const acao = texto(formData, "acao");
  const confirmar = acao === "confirmar";
  const notaIdBruto = Number(formData.get("nota_id"));
  const notaId = Number.isInteger(notaIdBruto) && notaIdBruto > 0 ? notaIdBruto : null;

  const fornecedorId = Number(formData.get("fornecedor_id"));
  const numero = texto(formData, "numero");
  const serie = texto(formData, "serie");
  const emissaoIso = texto(formData, "data_emissao");
  const frete = lerNumero(formData, "valor_frete");
  const desconto = lerNumero(formData, "valor_desconto");
  const lidos = lerItens(formData);

  if (!Number.isInteger(fornecedorId)) {
    return { error: "Selecione o fornecedor." };
  }
  if (!numero) return { error: "Informe o número da nota." };
  if (numero.length > 20) return { error: "Número da nota muito longo." };
  if (serie.length > 10) return { error: "Série muito longa." };
  if (!ehIsoData(emissaoIso)) return { error: "Data de emissão inválida." };
  if ("error" in lidos) return { error: lidos.error };
  const itens = lidos.itens ?? [];
  if (confirmar && itens.length === 0) {
    return { error: "Adicione ao menos um item para confirmar a entrada." };
  }
  if (!Number.isFinite(frete) || frete < 0) {
    return { error: "Frete inválido." };
  }
  if (!Number.isFinite(desconto) || desconto < 0) {
    return { error: "Desconto inválido." };
  }

  const totais = totaisDaNota(itens, frete, desconto);
  if (totais.valor_total < 0) {
    return { error: "O valor total da nota não pode ser negativo." };
  }

  const fornecedor = await prisma.fornecedor.findFirst({
    where: { id: fornecedorId, ativo: true },
  });
  if (!fornecedor) return { error: "Fornecedor inválido." };

  if (itens.length > 0) {
    const produtos = await prisma.produto.findMany({
      where: { id: { in: itens.map((item) => item.produto_id) } },
      select: { id: true, tipo: true, ativo: true, nome: true },
    });
    const mapa = new Map(produtos.map((produto) => [produto.id, produto]));
    for (const item of itens) {
      const produto = mapa.get(item.produto_id);
      if (!produto || !produto.ativo) {
        return { error: "Um dos produtos não está ativo." };
      }
      if (!(TIPOS_INSUMO as readonly string[]).includes(produto.tipo)) {
        return {
          error: `A nota de entrada só aceita insumo ou embalagem (${produto.nome}).`,
        };
      }
    }
  }

  const data_emissao = dataUtcMeiaNoite(emissaoIso);
  const dadosNota = {
    fornecedor_id: fornecedor.id,
    numero,
    serie: serie || null,
    data_emissao,
    valor_produtos: totais.valor_produtos,
    valor_frete: totais.valor_frete,
    valor_desconto: totais.valor_desconto,
    valor_total: totais.valor_total,
    usuario_id: usuario.id,
  };

  try {
    const notaIdSalva = await prisma.$transaction(async (tx) => {
      let id = notaId;
      if (id) {
        const existente = await tx.nota_fiscal_entrada.findUnique({
          where: { id },
        });
        if (!existente) throw new Error("NOTA_INEXISTENTE");
        if (existente.status !== "lancada") throw new Error("NOTA_TRAVADA");
        await tx.nota_fiscal_entrada.update({
          where: { id },
          data: dadosNota,
        });
        await tx.nota_fiscal_entrada_item.deleteMany({
          where: { nota_fiscal_entrada_id: id },
        });
      } else {
        const criada = await tx.nota_fiscal_entrada.create({
          data: { ...dadosNota, status: "lancada" },
        });
        id = criada.id;
      }

      if (itens.length > 0) {
        await tx.nota_fiscal_entrada_item.createMany({
          data: itens.map((item) => ({
            nota_fiscal_entrada_id: id!,
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            valor_total: arredondarDinheiro(
              item.quantidade * item.valor_unitario,
            ),
          })),
        });
      }

      if (!confirmar) return id!;

      await aplicarConfirmacaoEntrada(tx, {
        notaId: id!,
        numero,
        fornecedorId: fornecedor.id,
        nomeFornecedor: fornecedor.nome_fantasia || fornecedor.razao_social,
        valorTotal: totais.valor_total,
        dataEmissao: data_emissao,
        dataEntrada: dataUtcMeiaNoite(dataLocalISO()),
        usuarioId: usuario.id,
      });

      return id!;
    });

    revalidar();
    redirect(`/compras/${notaIdSalva}`);
  } catch (erro) {
    if (erroUnico(erro)) {
      return { error: "Já existe uma nota com este número e série para o fornecedor." };
    }
    if (erro instanceof Error && erro.message === "NOTA_TRAVADA") {
      return { error: "Esta nota já foi confirmada e não pode ser editada." };
    }
    if (erro instanceof Error && erro.message === "NOTA_INEXISTENTE") {
      return { error: "Nota não encontrada." };
    }
    if (erro instanceof Error && erro.message === "SEM_ITENS") {
      return { error: "Adicione ao menos um item para confirmar a entrada." };
    }
    throw erro;
  }
}

export async function excluirNotaRascunho(id: number): Promise<{ error?: string }> {
  await exigirCompras();
  if (!Number.isInteger(id)) return { error: "Nota inválida." };

  const nota = await prisma.nota_fiscal_entrada.findUnique({ where: { id } });
  if (!nota) return { error: "Nota não encontrada." };
  if (nota.status !== "lancada") {
    return { error: "Só é possível excluir notas em rascunho (lançadas)." };
  }

  await prisma.nota_fiscal_entrada.delete({ where: { id } });
  revalidar();
  redirect("/compras");
}

export async function cancelarNotaConferida(
  id: number,
): Promise<{ error?: string }> {
  const usuario = await exigirCompras();
  if (!Number.isInteger(id)) return { error: "Nota inválida." };

  try {
    await prisma.$transaction(async (tx) => {
      await reverterNotaConferida(tx, { notaId: id, usuarioId: usuario.id });
    });
  } catch (erro) {
    if (erro instanceof Error && erro.message === "CONTA_PAGA") {
      return {
        error:
          "Não é possível cancelar: a conta a pagar desta nota já foi paga. Resolva o financeiro manualmente primeiro.",
      };
    }
    if (erro instanceof Error && erro.message === "NOTA_NAO_CONFERIDA") {
      return { error: "Só é possível cancelar uma nota conferida." };
    }
    if (erro instanceof Error && erro.message === "NOTA_INEXISTENTE") {
      return { error: "Nota não encontrada." };
    }
    throw erro;
  }

  revalidar();
  redirect(`/compras/${id}`);
}
