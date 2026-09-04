import Link from "next/link";
import { formatarDataHora } from "@/lib/format";
import { formatarDataIso, isoDeDateUtc } from "@/lib/etiquetas";
import { nomeExibicao } from "@/lib/visibilidade";

type Item = {
  id: number;
  lote: string;
  quantidade_etiquetas: number;
  data_fabricacao: Date;
  data_acondicionamento: Date;
  data_validade: Date | null;
  criado_em: Date;
  produto: { nome: string };
  usuario: { nome?: string | null; email?: string | null; perfil?: string | null };
};

export function EtiquetasHistorico({
  itens,
  busca,
  perfilLogado,
}: {
  itens: Item[];
  busca: string;
  perfilLogado: string;
}) {
  return (
    <section className="print-ocultar flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Histórico</h2>
        <p className="text-sm text-texto-secundario">
          Últimas impressões. Busque por lote ou nome do produto.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 w-full flex-1 flex-col gap-1 text-sm sm:min-w-64">
          Buscar
          <input
            name="q"
            defaultValue={busca}
            placeholder="Lote ou produto"
            className="min-h-11 rounded border border-borda px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 rounded border border-borda bg-superficie px-4 py-2 text-sm font-medium hover:bg-fundo-hover"
        >
          Buscar
        </button>
      </form>

      {itens.length === 0 ? (
        <p className="text-sm text-texto-secundario">
          {busca
            ? "Nenhuma impressão encontrada para essa busca."
            : "Nenhuma etiqueta foi impressa ainda."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-borda bg-superficie">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-borda bg-fundo text-texto-secundario">
              <tr>
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Lote</th>
                <th className="px-3 py-2 font-medium">Qtd</th>
                <th className="px-3 py-2 font-medium">Fabricação</th>
                <th className="px-3 py-2 font-medium">Acond.</th>
                <th className="px-3 py-2 font-medium">Validade</th>
                <th className="px-3 py-2 font-medium">Quem imprimiu</th>
                <th className="px-3 py-2 font-medium">Quando</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id} className="border-b border-borda last:border-0">
                  <td className="px-3 py-2">{item.produto.nome}</td>
                  <td className="px-3 py-2 font-data">{item.lote}</td>
                  <td className="px-3 py-2 font-data">
                    {item.quantidade_etiquetas}
                  </td>
                  <td className="px-3 py-2 font-data">
                    {formatarDataIso(isoDeDateUtc(item.data_fabricacao))}
                  </td>
                  <td className="px-3 py-2 font-data">
                    {formatarDataIso(isoDeDateUtc(item.data_acondicionamento))}
                  </td>
                  <td className="px-3 py-2 font-data">
                    {item.data_validade
                      ? formatarDataIso(isoDeDateUtc(item.data_validade))
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {nomeExibicao(item.usuario, perfilLogado).nome}
                  </td>
                  <td className="px-3 py-2 text-texto-secundario">
                    {formatarDataHora(item.criado_em)}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/etiquetas?impressao=${item.id}`}
                      className="text-texto-primario underline-offset-2 hover:underline"
                    >
                      Ver prévia
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
