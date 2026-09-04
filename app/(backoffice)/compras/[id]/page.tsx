import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatarData, formatarPreco, formatarQuantidade } from "@/lib/format";
import { exigirAcesso, temAcesso } from "@/lib/permissoes";
import {
  classesStatusNota,
  rotuloStatusNota,
} from "@/lib/compras";
import { rotuloStatusConta } from "@/lib/financeiro";
import {
  SELECT_USUARIO_RELACAO,
  nomeExibicao,
} from "@/lib/visibilidade";
import { CancelarNotaButton } from "../cancelar-button";
import { CompraForm } from "../compra-form";
import { ExcluirNotaButton } from "../excluir-button";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CompraDetalhePage({ params }: Props) {
  const usuario = await exigirAcesso("compras");
  const { id } = await params;
  const notaId = Number(id);
  if (!Number.isInteger(notaId)) notFound();

  const [nota, fornecedores] = await Promise.all([
    prisma.nota_fiscal_entrada.findUnique({
      where: { id: notaId },
      include: {
        fornecedor: true,
        usuario: { select: SELECT_USUARIO_RELACAO },
        nota_fiscal_entrada_item: {
          include: {
            produto: { include: { unidade_medida: true } },
          },
          orderBy: { id: "asc" },
        },
        conta_pagar: { orderBy: { id: "desc" }, take: 1 },
      },
    }),
    prisma.fornecedor.findMany({
      where: { ativo: true },
      orderBy: { razao_social: "asc" },
      select: { id: true, razao_social: true, nome_fantasia: true },
    }),
  ]);

  if (!nota) notFound();

  const nomeFornecedor =
    nota.fornecedor.nome_fantasia || nota.fornecedor.razao_social;
  const conta = nota.conta_pagar[0];
  const verFinanceiro = await temAcesso(usuario.id, "financeiro");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/compras" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para compras
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              NF-e {nota.numero}
              {nota.serie ? `/${nota.serie}` : ""}
            </h1>
            <p className="mt-1 text-sm text-texto-secundario">
              {nomeFornecedor}
            </p>
            <p className="text-sm text-texto-secundario">
              Lançada por {nomeExibicao(nota.usuario, usuario.perfil).nome}
            </p>
          </div>
          <span className={classesStatusNota(nota.status)}>
            {rotuloStatusNota(nota.status)}
          </span>
        </div>
      </div>

      {nota.status === "lancada" ? (
        <>
          <p className="text-sm text-texto-secundario">
            Rascunho — ainda não movimentou estoque nem gerou conta a pagar.
          </p>
          <CompraForm
            fornecedores={fornecedores}
            nota={{
              id: nota.id,
              fornecedor_id: nota.fornecedor_id,
              numero: nota.numero,
              serie: nota.serie ?? "",
              data_emissao: nota.data_emissao,
              valor_frete: Number(nota.valor_frete ?? 0),
              valor_desconto: Number(nota.valor_desconto ?? 0),
              itens: nota.nota_fiscal_entrada_item.map((item) => ({
                produto_id: item.produto_id,
                nome: item.produto.nome,
                unidade: item.produto.unidade_medida.sigla,
                quantidade: Number(item.quantidade),
                valor_unitario: Number(item.valor_unitario),
              })),
            }}
          />
          <ExcluirNotaButton id={nota.id} />
        </>
      ) : (
        <>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded border border-borda bg-superficie p-3">
              <dt className="text-xs text-texto-secundario">Emissão</dt>
              <dd>{formatarData(nota.data_emissao)}</dd>
            </div>
            <div className="rounded border border-borda bg-superficie p-3">
              <dt className="text-xs text-texto-secundario">Produtos</dt>
              <dd className="font-data">{formatarPreco(nota.valor_produtos)}</dd>
            </div>
            <div className="rounded border border-borda bg-superficie p-3">
              <dt className="text-xs text-texto-secundario">Frete / desconto</dt>
              <dd className="font-data">
                {formatarPreco(nota.valor_frete)} /{" "}
                {formatarPreco(nota.valor_desconto)}
              </dd>
            </div>
            <div className="rounded border border-borda bg-superficie p-3">
              <dt className="text-xs text-texto-secundario">Total</dt>
              <dd className="font-data text-lg font-semibold">
                {formatarPreco(nota.valor_total)}
              </dd>
            </div>
          </dl>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">Itens</h2>
            {nota.nota_fiscal_entrada_item.length === 0 ? (
              <p className="text-sm text-texto-secundario">Nenhum item.</p>
            ) : (
              <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">Produto</th>
                      <th className="px-3 py-2 font-medium">Qtd</th>
                      <th className="px-3 py-2 font-medium">Valor unitário</th>
                      <th className="px-3 py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nota.nota_fiscal_entrada_item.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-zinc-100 last:border-0"
                      >
                        <td className="px-3 py-2">{item.produto.nome}</td>
                        <td className="px-3 py-2 font-data">
                          {formatarQuantidade(item.quantidade)}{" "}
                          {item.produto.unidade_medida.sigla}
                        </td>
                        <td className="px-3 py-2 font-data">
                          {formatarPreco(item.valor_unitario)}
                        </td>
                        <td className="px-3 py-2 font-data">
                          {formatarPreco(item.valor_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {conta ? (
            <p className="text-sm text-texto-secundario">
              Conta a pagar: {conta.descricao} · {formatarPreco(conta.valor)} ·{" "}
              {rotuloStatusConta(conta.status)}
              {verFinanceiro ? (
                <>
                  {" "}
                  <Link
                    href={
                      conta.status === "cancelada"
                        ? "/financeiro?aba=pagar&status=cancelada"
                        : "/financeiro?aba=pagar"
                    }
                    className="text-texto-primario underline-offset-2 hover:underline"
                  >
                    Abrir no financeiro
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}

          {nota.status === "conferida" ? (
            <CancelarNotaButton id={nota.id} />
          ) : null}
        </>
      )}
    </div>
  );
}
