import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { abaPorTipo, TIPOS_INSUMO } from "@/lib/produto-tipo";
import { atualizarProduto } from "../../actions";
import { FichaTecnicaSecao } from "../../ficha-tecnica-secao";
import { ProdutoForm } from "../../produto-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarProdutoPage({ params }: Props) {
  const { id } = await params;
  const produtoId = Number(id);
  if (!Number.isInteger(produtoId)) notFound();

  const [produto, categorias, unidades] = await Promise.all([
    prisma.produto.findUnique({ where: { id: produtoId } }),
    prisma.categoria_produto.findMany({ orderBy: { nome: "asc" } }),
    prisma.unidade_medida.findMany({ orderBy: { sigla: "asc" } }),
  ]);

  if (!produto) notFound();

  const atualizar = atualizarProduto.bind(null, produto.id);
  const aba = abaPorTipo(produto.tipo);

  const ficha =
    produto.tipo === "produto_final"
      ? await prisma.ficha_tecnica.findMany({
          where: { produto_final_id: produto.id },
          include: {
            produto_ficha_tecnica_insumo_idToproduto: {
              include: { unidade_medida: true },
            },
          },
          orderBy: { id: "asc" },
        })
      : [];

  const idsVinculados = ficha.map((item) => item.insumo_id);
  const insumosDisponiveis =
    produto.tipo === "produto_final"
      ? await prisma.produto.findMany({
          where: {
            ativo: true,
            tipo: { in: [...TIPOS_INSUMO] },
            id: { notIn: [produto.id, ...idsVinculados] },
          },
          include: { unidade_medida: true },
          orderBy: { nome: "asc" },
        })
      : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/produtos?aba=${aba}`}
          className="text-sm text-zinc-600 hover:underline"
        >
          ← Voltar para produtos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Editar produto
        </h1>
      </div>
      <ProdutoForm
        action={atualizar}
        categorias={categorias}
        unidades={unidades}
        submitLabel="Salvar"
        produto={{
          nome: produto.nome,
          codigo: produto.codigo,
          codigo_barras: produto.codigo_barras,
          categoria_id: produto.categoria_id,
          unidade_medida_id: produto.unidade_medida_id,
          preco_venda: produto.preco_venda?.toString() ?? null,
          estoque_minimo: produto.estoque_minimo?.toString() ?? null,
          estoque_ideal: produto.estoque_ideal?.toString() ?? null,
          estoque_maximo: produto.estoque_maximo?.toString() ?? null,
          estoque_atual: produto.estoque_atual?.toString() ?? null,
          controla_estoque: produto.controla_estoque,
          dias_validade: produto.dias_validade,
          vendido_por_peso: produto.vendido_por_peso,
          peso_aproximado_g: produto.peso_aproximado_g?.toString() ?? null,
          ingredientes: produto.ingredientes,
          contem_alergenicos: produto.contem_alergenicos,
          pode_conter_tracos: produto.pode_conter_tracos,
          permite_venda_pacote: produto.permite_venda_pacote,
          quantidade_por_pacote:
            produto.quantidade_por_pacote?.toString() ?? null,
          preco_pacote: produto.preco_pacote?.toString() ?? null,
        }}
      />
      {produto.tipo === "produto_final" ? (
        <FichaTecnicaSecao
          produtoId={produto.id}
          itens={ficha.map((item) => ({
            id: item.id,
            quantidade: item.quantidade,
            insumo: {
              id: item.produto_ficha_tecnica_insumo_idToproduto.id,
              nome: item.produto_ficha_tecnica_insumo_idToproduto.nome,
              unidade:
                item.produto_ficha_tecnica_insumo_idToproduto.unidade_medida
                  .sigla,
            },
          }))}
          insumos={insumosDisponiveis.map((insumo) => ({
            id: insumo.id,
            nome: insumo.nome,
            unidade: insumo.unidade_medida.sigla,
          }))}
        />
      ) : null}
    </div>
  );
}
