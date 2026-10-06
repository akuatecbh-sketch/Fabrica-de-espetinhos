import Link from "next/link";
import { notFound } from "next/navigation";
import { formatarData, formatarDataHora, formatarPreco, formatarQuantidade } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { exigirAcesso, temAcesso } from "@/lib/permissoes";
import { SELECT_USUARIO_RELACAO, nomeExibicao } from "@/lib/visibilidade";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DetalheProducaoPage({ params }: Props) {
  const usuario = await exigirAcesso("producao");
  const { id } = await params;
  const producaoId = Number(id);
  if (!Number.isInteger(producaoId) || producaoId <= 0) notFound();

  const [producao, podeCancelar] = await Promise.all([
    prisma.producao.findUnique({
      where: { id: producaoId },
      include: {
        produto: { include: { unidade_medida: { select: { sigla: true } } } },
        usuario: { select: SELECT_USUARIO_RELACAO },
        cancelada_por: { select: SELECT_USUARIO_RELACAO },
        producao_item: {
          include: {
            insumo: { include: { unidade_medida: { select: { sigla: true } } } },
          },
          orderBy: { id: "asc" },
        },
      },
    }),
    temAcesso(usuario.id, "cancelar_producao"),
  ]);
  if (!producao) notFound();

  const cancelada = producao.status === "cancelada";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/producao"
            className="text-sm text-zinc-600 hover:underline"
          >
            ← Voltar para produção
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Produção #{producao.id}
          </h1>
        </div>
        {podeCancelar && !cancelada ? (
          <Link
            href={`/producao/${producao.id}/cancelar`}
            className="inline-flex min-h-11 items-center rounded border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Cancelar produção
          </Link>
        ) : null}
      </div>

      {cancelada ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Cancelada
          {producao.cancelada_em
            ? ` em ${formatarDataHora(producao.cancelada_em)}`
            : ""}
          {producao.cancelada_por
            ? ` por ${nomeExibicao(producao.cancelada_por, usuario.perfil).nome}`
            : ""}
          {producao.motivo_cancelamento
            ? `. Motivo: ${producao.motivo_cancelamento}`
            : "."}
        </p>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-texto-secundario">Produto</dt>
            <dd className="text-sm">{producao.produto.nome}</dd>
          </div>
          <div>
            <dt className="text-xs text-texto-secundario">Quantidade</dt>
            <dd className="font-data text-sm">
              {formatarQuantidade(producao.quantidade)}{" "}
              {producao.produto.unidade_medida.sigla}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-texto-secundario">Data</dt>
            <dd className="font-data text-sm">{formatarData(producao.data)}</dd>
          </div>
          <div>
            <dt className="text-xs text-texto-secundario">Custo dos insumos</dt>
            <dd className="font-data text-sm">
              {formatarPreco(producao.custo_total)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-texto-secundario">Registrado por</dt>
            <dd className="text-sm">
              {nomeExibicao(producao.usuario, usuario.perfil).nome}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-texto-secundario">Registrado em</dt>
            <dd className="font-data text-sm">
              {formatarDataHora(producao.criado_em)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-texto-secundario">Observação</dt>
            <dd className="text-sm">{producao.observacao || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
        <h2 className="text-sm font-medium text-zinc-900">Insumos</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-zinc-600">
              <tr>
                <th className="py-2 pr-3 font-medium">Insumo</th>
                <th className="py-2 pr-3 font-medium">Quantidade</th>
                <th className="py-2 pr-3 font-medium">Custo unitário</th>
                <th className="py-2 font-medium">Custo</th>
              </tr>
            </thead>
            <tbody>
              {producao.producao_item.map((item) => (
                <tr key={item.id} className="border-b border-zinc-100">
                  <td className="py-2 pr-3">
                    {item.insumo.nome}
                    {!item.controla_estoque ? (
                      <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs text-texto-secundario">
                        não controlado
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 font-data">
                    {formatarQuantidade(item.quantidade)}{" "}
                    {item.insumo.unidade_medida.sigla}
                  </td>
                  <td className="py-2 pr-3 font-data">
                    {formatarPreco(item.custo_unitario)}
                  </td>
                  <td className="py-2 font-data">
                    {formatarPreco(item.custo_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
