import Link from "next/link";
import { formatarDataHora, formatarQuantidade } from "@/lib/format";
import {
  TIPOS_MOVIMENTACAO,
  rotuloTipoMovimentacao,
} from "@/lib/estoque";
import { CardRegistro } from "../card-registro";
import { Paginacao } from "./paginacao";
import { nomeExibicao } from "@/lib/visibilidade";

type Movimento = {
  id: number;
  tipo: string;
  quantidade: { toString(): string };
  saldo_anterior: { toString(): string };
  saldo_atual: { toString(): string };
  origem_tipo: string | null;
  origem_id: number | null;
  observacao: string | null;
  criado_em: Date;
  produto: { nome: string };
  usuario: { nome: string; email?: string; perfil?: string } | null;
  hrefOrigem: string | null;
};

function Origem({ movimento }: { movimento: Movimento }) {
  if (!movimento.hrefOrigem) return <span>—</span>;
  const rotulo =
    movimento.origem_tipo === "nota_fiscal_entrada"
      ? "Ver nota"
      : "Ver vendas de hoje";
  return (
    <Link
      href={movimento.hrefOrigem}
      className="text-texto-primario underline-offset-2 hover:underline"
    >
      {rotulo}
    </Link>
  );
}

export function ListaMovimentacoes({
  movimentos,
  busca,
  tipo,
  de,
  ate,
  pagina,
  totalPaginas,
  perfilDeQuemVeVe,
}: {
  movimentos: Movimento[];
  busca: string;
  tipo: string;
  de: string;
  ate: string;
  pagina: number;
  totalPaginas: number;
  perfilDeQuemVeVe: string;
}) {
  function hrefPagina(alvo: number) {
    const params = new URLSearchParams();
    params.set("aba", "movimentacoes");
    if (busca) params.set("q", busca);
    if (tipo && tipo !== "todos") params.set("tipo", tipo);
    if (de) params.set("de", de);
    if (ate) params.set("ate", ate);
    if (alvo > 1) params.set("pagina", String(alvo));
    return `/estoque?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        method="get"
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <input type="hidden" name="aba" value="movimentacoes" />
        <label className="flex min-w-0 w-full flex-1 flex-col gap-1 text-sm sm:min-w-64">
          Produto
          <input
            name="q"
            defaultValue={busca}
            placeholder="Nome do produto"
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tipo
          <select
            name="tipo"
            defaultValue={tipo}
            className="rounded border border-zinc-300 bg-white px-3 py-2"
          >
            <option value="todos">Todos</option>
            {TIPOS_MOVIMENTACAO.map((opcao) => (
              <option key={opcao} value={opcao}>
                {rotuloTipoMovimentacao(opcao)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          De
          <input
            type="date"
            name="de"
            defaultValue={de}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          até
          <input
            type="date"
            name="ate"
            defaultValue={ate}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Filtrar
        </button>
      </form>

      {movimentos.length === 0 ? (
        <p className="text-sm text-texto-secundario">
          Nenhuma movimentação encontrada.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-3 md:hidden">
            {movimentos.map((movimento) => (
              <li key={movimento.id}>
                <CardRegistro acoes={<Origem movimento={movimento} />}>
                  <p className="font-medium text-texto-primario">
                    {movimento.produto.nome}
                  </p>
                  <p className="text-sm text-texto-secundario">
                    {formatarDataHora(movimento.criado_em)}
                  </p>
                  <p className="text-sm">{rotuloTipoMovimentacao(movimento.tipo)}</p>
                  <p className="font-data text-sm">
                    {formatarQuantidade(movimento.quantidade)} ·{" "}
                    {formatarQuantidade(movimento.saldo_anterior)} →{" "}
                    {formatarQuantidade(movimento.saldo_atual)}
                  </p>
                  <p className="text-xs text-texto-secundario">
                    {nomeExibicao(movimento.usuario, perfilDeQuemVeVe).nome}
                  </p>
                  {movimento.observacao ? (
                    <p className="text-sm text-texto-secundario">
                      {movimento.observacao}
                    </p>
                  ) : null}
                </CardRegistro>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Produto</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Qtd</th>
                  <th className="px-3 py-2 font-medium">Anterior</th>
                  <th className="px-3 py-2 font-medium">Atual</th>
                  <th className="px-3 py-2 font-medium">Usuário</th>
                  <th className="px-3 py-2 font-medium">Observação</th>
                  <th className="px-3 py-2 font-medium">Origem</th>
                </tr>
              </thead>
              <tbody>
                {movimentos.map((movimento) => (
                  <tr
                    key={movimento.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatarDataHora(movimento.criado_em)}
                    </td>
                    <td className="px-3 py-2">{movimento.produto.nome}</td>
                    <td className="px-3 py-2">
                      {rotuloTipoMovimentacao(movimento.tipo)}
                    </td>
                    <td className="px-3 py-2 font-data">
                      {formatarQuantidade(movimento.quantidade)}
                    </td>
                    <td className="px-3 py-2 font-data">
                      {formatarQuantidade(movimento.saldo_anterior)}
                    </td>
                    <td className="px-3 py-2 font-data">
                      {formatarQuantidade(movimento.saldo_atual)}
                    </td>
                    <td className="px-3 py-2">
                      {nomeExibicao(movimento.usuario, perfilDeQuemVeVe).nome}
                    </td>
                    <td className="px-3 py-2 text-texto-secundario">
                      {movimento.observacao ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Origem movimento={movimento} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Paginacao
            pagina={pagina}
            totalPaginas={totalPaginas}
            hrefPara={hrefPagina}
          />
        </>
      )}
    </div>
  );
}
