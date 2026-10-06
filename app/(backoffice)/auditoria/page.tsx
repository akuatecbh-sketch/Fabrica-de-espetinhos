import { formatarDataHora } from "@/lib/format";
import { exigirAcesso } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { rotuloAcaoAuditoria } from "@/lib/auditoria";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AuditoriaPage() {
  await exigirAcesso("auditoria");
  const registros = await prisma.log_auditoria.findMany({
    orderBy: { criado_em: "desc" },
    take: 100,
    include: {
      usuario: { select: { nome: true, email: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
        <p className="mt-1 text-sm text-texto-secundario">
          Últimos 100 registros de ações sensíveis.
        </p>
      </div>

      {registros.length === 0 ? (
        <p className="text-sm text-texto-secundario">Nenhum registro ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-3 py-2 font-medium">Quando</th>
                <th className="px-3 py-2 font-medium">Usuário</th>
                <th className="px-3 py-2 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((registro) => (
                <tr
                  key={registro.id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="px-3 py-2 whitespace-nowrap font-data">
                    {formatarDataHora(registro.criado_em)}
                  </td>
                  <td className="px-3 py-2">
                    {registro.usuario
                      ? `${registro.usuario.nome} · ${registro.usuario.email}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {rotuloAcaoAuditoria(
                      registro.acao,
                      registro.valor_novo,
                      registro.entidade_id,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
