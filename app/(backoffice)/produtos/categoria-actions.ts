"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/lib/sessao";
import { ehTipoCategoria } from "@/lib/produto-tipo";

export type CategoriaOpcao = {
  id: number;
  nome: string;
  tipo: string;
};

export type CategoriaComUso = CategoriaOpcao & {
  produtos: number;
};

function revalidarCategorias() {
  revalidatePath("/produtos");
  revalidatePath("/produtos/novo");
}

export async function criarCategoria(
  nomeBruto: string,
  tipoBruto: string,
): Promise<{ error?: string; categoria?: CategoriaOpcao }> {
  await exigirModulo("produtos");
  const nome = nomeBruto.trim();
  const tipo = tipoBruto.trim();

  if (!nome) return { error: "Informe o nome da categoria." };
  if (nome.length > 80) {
    return { error: "O nome da categoria deve ter no máximo 80 caracteres." };
  }
  if (!ehTipoCategoria(tipo)) return { error: "Selecione um tipo válido." };

  const categoria = await prisma.categoria_produto.create({
    data: { nome, tipo },
    select: { id: true, nome: true, tipo: true },
  });

  return { categoria };
}

export async function listarCategoriasComUso(): Promise<CategoriaComUso[]> {
  await exigirModulo("produtos");
  const categorias = await prisma.categoria_produto.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { produto: true } } },
  });
  return categorias.map((categoria) => ({
    id: categoria.id,
    nome: categoria.nome,
    tipo: categoria.tipo,
    produtos: categoria._count.produto,
  }));
}

export async function excluirCategoria(
  id: number,
): Promise<{ error?: string }> {
  await exigirModulo("produtos");
  if (!Number.isInteger(id)) return { error: "Categoria inválida." };

  const quantidade = await prisma.produto.count({
    where: { categoria_id: id },
  });
  if (quantidade > 0) {
    return {
      error: `Não é possível excluir: ${quantidade} produto(s) usam esta categoria. Troque a categoria desses produtos antes.`,
    };
  }

  const existente = await prisma.categoria_produto.findUnique({
    where: { id },
  });
  if (!existente) return { error: "Categoria não encontrada." };

  await prisma.categoria_produto.delete({ where: { id } });
  revalidarCategorias();
  return {};
}
