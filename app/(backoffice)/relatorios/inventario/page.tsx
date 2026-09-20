import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatarDataHora } from "@/lib/format";
import { exigirAcesso } from "@/lib/permissoes";
import { SELECT_USUARIO_RELACAO, nomeExibicao } from "@/lib/visibilidade";
import {
  classeBadgeStatusInventario,
  rotuloStatusInventario,
} from "@/lib/inventario";
import { CardRegistro } from "../../card-registro";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InventarioListaPage() {
  const logado = await exigirAcesso("relatorios");
  const sessoes = await prisma.inventario_contagem.findMany({
    orderBy: { criado_em: "desc" },
    include: {
      usuario: { select: SELECT_USUARIO_RELACAO },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/relatorios"
            className="text-sm text-zinc-600 hover:underline"
          >
            ← Voltar para relatórios
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Inventário físico
          </h1>
          <p className="mt-1 text-sm text-texto-secundario">
            Compare a contagem real com o estoque do sistema e aplique
            ajustes.
          </p>
        </div>
        <Link
          href="/relatorios/inventario/novo"
          className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
        >
          Nova contagem
        </Link>
      </div>

      {sessoes.length === 0 ? (
        <p className="text-sm text-texto-secundario">
          Nenhuma contagem registrada ainda.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-3 md:hidden">
            {sessoes.map((sessao) => {
              const autor = nomeExibicao(sessao.usuario, logado.perfil);
              return (
                <li key={sessao.id}>
                  <CardRegistro>
                    <p className="font-medium text-texto-primario">
                      {sessao.descricao}
                    </p>
                    <p>
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${classeBadgeStatusInventario(sessao.status)}`}
                      >
                        {rotuloStatusInventario(sessao.status)}
                      </span>
                    </p>
                    <p className="text-sm text-texto-secundario">
                      {autor.nome} · {formatarDataHora(sessao.criado_em)}
                      {sessao.finalizado_em
                        ? ` · finalizada ${formatarDataHora(sessao.finalizado_em)}`
                        : ""}
                    </p>
                    <Link
                      href={`/relatorios/inventario/${sessao.id}`}
                      className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
                    >
                      Abrir
                    </Link>
                  </CardRegistro>
                </li>
              );
            })}
          </ul>

          <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Descrição</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Quem fez</th>
                  <th className="px-3 py-2 font-medium">Criada em</th>
                  <th className="px-3 py-2 font-medium">Finalizada em</th>
                  <th className="px-3 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sessoes.map((sessao) => {
                  const autor = nomeExibicao(sessao.usuario, logado.perfil);
                  return (
                    <tr
                      key={sessao.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="px-3 py-2">{sessao.descricao}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${classeBadgeStatusInventario(sessao.status)}`}
                        >
                          {rotuloStatusInventario(sessao.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2">{autor.nome}</td>
                      <td className="px-3 py-2 font-data">
                        {formatarDataHora(sessao.criado_em)}
                      </td>
                      <td className="px-3 py-2 font-data">
                        {sessao.finalizado_em
                          ? formatarDataHora(sessao.finalizado_em)
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/relatorios/inventario/${sessao.id}`}
                          className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
