import Link from "next/link";
import { formatarPreco, formatarQuantidade } from "@/lib/format";
import { estoqueCritico } from "@/lib/estoque-critico";
import { CardRegistro } from "../card-registro";
import { InativarButton } from "./inativar-button";

type ProdutoLista = {
  id: number;
  nome: string;
  codigo: string | null;
  codigo_barras: string | null;
  estoque_atual: { toString(): string };
  estoque_minimo: { toString(): string } | null;
  preco_venda: { toString(): string } | null;
  ativo: boolean;
  permite_venda_pacote: boolean;
  categoria_produto: { nome: string };
  unidade_medida: { sigla: string };
};

function BadgeEstoque({ produto }: { produto: ProdutoLista }) {
  if (Number(produto.estoque_atual) >= Number(produto.estoque_minimo ?? 0)) {
    return null;
  }
  return (
    <span
      className={`rounded bg-ambar/10 px-2 py-0.5 text-xs font-medium text-ambar ${
        estoqueCritico(produto.estoque_atual, produto.estoque_minimo)
          ? "pulso-ambar"
          : ""
      }`}
    >
      Repor estoque
    </span>
  );
}

function AcoesProduto({ produto }: { produto: ProdutoLista }) {
  return (
    <>
      <Link
        href={`/produtos/${produto.id}/editar`}
        className="inline-flex min-h-11 items-center text-texto-primario underline-offset-2 hover:underline md:min-h-0"
      >
        Editar
      </Link>
      {produto.ativo ? (
        <InativarButton id={produto.id} nome={produto.nome} />
      ) : null}
    </>
  );
}

export function ListaProdutos({
  produtos,
  vazio,
}: {
  produtos: ProdutoLista[];
  vazio: string;
}) {
  if (produtos.length === 0) {
    return <p className="text-sm text-texto-secundario">{vazio}</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {produtos.map((produto) => (
          <li key={produto.id}>
            <CardRegistro acoes={<AcoesProduto produto={produto} />}>
              <p className="font-medium text-texto-primario">{produto.nome}</p>
              <p className="text-sm text-texto-secundario">
                {produto.categoria_produto.nome}
              </p>
              <p className="font-data text-sm text-texto-primario">
                Estoque {formatarQuantidade(produto.estoque_atual)}{" "}
                {produto.unidade_medida.sigla}
                {" · "}
                {formatarPreco(produto.preco_venda)}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                <BadgeEstoque produto={produto} />
                {produto.ativo ? (
                  <span className="rounded bg-verde-sucesso/10 px-2 py-0.5 text-xs font-medium text-verde-sucesso">
                    Ativo
                  </span>
                ) : (
                  <span className="text-xs text-texto-secundario">Inativo</span>
                )}
                {produto.permite_venda_pacote ? (
                  <span className="rounded bg-verde-sucesso/10 px-2 py-0.5 text-xs font-medium text-verde-sucesso">
                    Vende em pacote
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-texto-secundario">
                Código {produto.codigo || "—"}
                {produto.codigo_barras?.trim()
                  ? ` · Barras ${produto.codigo_barras.trim()}`
                  : ""}
              </p>
            </CardRegistro>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">Código interno</th>
              <th className="px-3 py-2 font-medium">Código de barras</th>
              <th className="px-3 py-2 font-medium">Categoria</th>
              <th className="px-3 py-2 font-medium">Unidade</th>
              <th className="px-3 py-2 font-medium">Estoque</th>
              <th className="px-3 py-2 font-medium">Preço de venda</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((produto) => (
              <tr
                key={produto.id}
                className="border-b border-zinc-100 last:border-0"
              >
                <td className="px-3 py-2">
                  <div className="flex flex-col items-start gap-1">
                    <span>{produto.nome}</span>
                    {produto.permite_venda_pacote ? (
                      <span className="rounded bg-verde-sucesso/10 px-2 py-0.5 text-xs font-medium text-verde-sucesso">
                        Vende em pacote
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2">{produto.codigo || "—"}</td>
                <td className="px-3 py-2 font-mono">
                  {produto.codigo_barras?.trim() || "—"}
                </td>
                <td className="px-3 py-2">{produto.categoria_produto.nome}</td>
                <td className="px-3 py-2">{produto.unidade_medida.sigla}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-data">
                      {formatarQuantidade(produto.estoque_atual)}
                    </span>
                    <BadgeEstoque produto={produto} />
                  </div>
                </td>
                <td className="px-3 py-2 font-data">
                  {formatarPreco(produto.preco_venda)}
                </td>
                <td className="px-3 py-2">
                  {produto.ativo ? (
                    <span className="rounded bg-verde-sucesso/10 px-2 py-0.5 text-xs font-medium text-verde-sucesso">
                      Ativo
                    </span>
                  ) : (
                    <span className="text-texto-secundario">Inativo</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-3">
                    <AcoesProduto produto={produto} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
