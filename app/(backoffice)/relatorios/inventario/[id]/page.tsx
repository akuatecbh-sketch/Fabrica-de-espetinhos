import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatarDataHora, formatarPreco } from "@/lib/format";
import { exigirAcesso } from "@/lib/permissoes";
import { SELECT_USUARIO_RELACAO, nomeExibicao } from "@/lib/visibilidade";
import {
  classeBadgeStatusInventario,
  impactoEstimado,
  rotuloStatusInventario,
} from "@/lib/inventario";
import { ContagemClient } from "./contagem-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ContagemInventarioPage({ params }: Props) {
  const logado = await exigirAcesso("relatorios");
  const { id: idBruto } = await params;
  const id = Number(idBruto);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const contagem = await prisma.inventario_contagem.findUnique({
    where: { id },
    include: {
      usuario: { select: SELECT_USUARIO_RELACAO },
      inventario_item: {
        orderBy: { produto: { nome: "asc" } },
        include: {
          produto: {
            select: {
              nome: true,
              tipo: true,
              vendido_por_peso: true,
              preco_custo_medio: true,
              categoria_produto: { select: { nome: true } },
            },
          },
        },
      },
    },
  });
  if (!contagem) notFound();

  const autor = nomeExibicao(contagem.usuario, logado.perfil);
  const itens = contagem.inventario_item.map((item) => ({
    id: item.id,
    nome: item.produto.nome,
    categoria: item.produto.categoria_produto.nome,
    tipo: item.produto.tipo,
    vendidoPorPeso: item.produto.vendido_por_peso,
    estoqueSistema: Number(item.estoque_sistema),
    quantidadeContada:
      item.quantidade_contada == null ? null : Number(item.quantidade_contada),
    diferenca: item.diferenca == null ? null : Number(item.diferenca),
    ajusteAplicado: item.ajuste_aplicado,
    impacto: impactoEstimado(
      Number(item.diferenca ?? 0),
      item.produto.preco_custo_medio == null
        ? null
        : Number(item.produto.preco_custo_medio),
    ),
  }));

  const comDiferenca = itens.filter(
    (item) => item.diferenca != null && item.diferenca !== 0,
  );
  const impactoTotal = comDiferenca.reduce((acc, item) => acc + item.impacto, 0);
  const ajustesAplicados = comDiferenca.filter((item) => item.ajusteAplicado).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/relatorios/inventario"
          className="text-sm text-zinc-600 hover:underline"
        >
          ← Voltar para inventário
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {contagem.descricao}
            </h1>
            <p className="mt-1 text-sm text-texto-secundario">
              {autor.nome} · criada {formatarDataHora(contagem.criado_em)}
              {contagem.finalizado_em
                ? ` · finalizada ${formatarDataHora(contagem.finalizado_em)}`
                : ""}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${classeBadgeStatusInventario(contagem.status)}`}
          >
            {rotuloStatusInventario(contagem.status)}
          </span>
        </div>
      </div>

      {contagem.status === "finalizado" ? (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded border border-zinc-200 bg-white px-4 py-3">
            <p className="text-xs text-texto-secundario">Itens com diferença</p>
            <p className="font-data text-lg font-medium">{comDiferenca.length}</p>
          </div>
          <div className="rounded border border-zinc-200 bg-white px-4 py-3">
            <p className="text-xs text-texto-secundario">
              Impacto estimado (custo médio)
            </p>
            <p className="font-data text-lg font-medium">
              {formatarPreco(impactoTotal)}
            </p>
          </div>
          <div className="rounded border border-zinc-200 bg-white px-4 py-3">
            <p className="text-xs text-texto-secundario">Ajustes aplicados</p>
            <p className="font-data text-lg font-medium">
              {ajustesAplicados} de {comDiferenca.length}
            </p>
          </div>
        </section>
      ) : null}

      <ContagemClient
        key={contagem.status}
        inventarioId={contagem.id}
        status={contagem.status}
        itensIniciais={itens.map(
          ({ impacto: _impacto, ...item }) => item,
        )}
      />
    </div>
  );
}
