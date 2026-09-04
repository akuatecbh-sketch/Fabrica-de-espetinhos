import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterCaixaAberto } from "@/lib/caixa";
import { formatarPreco, formatarQuantidade } from "@/lib/format";
import {
  garantirFormasPagamento,
  listarTaxasVigentes,
} from "@/lib/formas-pagamento";
import { CardRegistro } from "../card-registro";
import { BarraAbas } from "./barra-abas";
import { CancelarVendaButton } from "./cancelar-venda-button";
import { ClienteVenda } from "./cliente-venda";
import { PagamentoModal } from "./pagamento-modal";
import { PdvBuscaProduto } from "./busca-produto";
import { RemoverItemButton } from "./remover-item-button";
import { linhaItemVenda, rotuloQuantidadeItem } from "@/lib/venda-item";
import { exigirAcesso } from "@/lib/permissoes";

export const dynamic = "force-dynamic";

export default async function PdvPage() {
  await exigirAcesso("pdv");
  const caixa = await obterCaixaAberto();
  if (!caixa) redirect("/caixa");

  const abas = await prisma.venda.findMany({
    where: { status: { in: ["aberta", "em_espera"] } },
    orderBy: { id: "asc" },
    select: {
      id: true,
      total: true,
      status: true,
      cliente: { select: { nome: true } },
    },
  });
  const focoId = abas.find((aba) => aba.status === "aberta")?.id ?? null;

  const venda = focoId
    ? await prisma.venda.findUnique({
        where: { id: focoId },
        include: {
          cliente: { select: { id: true, nome: true } },
          venda_item: {
            include: { produto: true },
            orderBy: { id: "asc" },
          },
        },
      })
    : null;

  const [formas, taxas] = venda
    ? await Promise.all([
        garantirFormasPagamento(),
        listarTaxasVigentes(),
      ])
    : [[], []];

  const formasModal = formas.map((forma) => ({
    id: forma.id,
    nome: forma.nome,
    tipo: forma.tipo,
  }));

  const clienteFoco = venda?.cliente ?? null;
  let historicoCliente: {
    quantidade: number;
    ultimaCompra: string | null;
  } | null = null;
  if (clienteFoco) {
    const [quantidade, ultima] = await Promise.all([
      prisma.venda.count({
        where: { cliente_id: clienteFoco.id, status: "finalizada" },
      }),
      prisma.venda.findFirst({
        where: { cliente_id: clienteFoco.id, status: "finalizada" },
        orderBy: { finalizado_em: "desc" },
        select: { finalizado_em: true },
      }),
    ]);
    historicoCliente = {
      quantidade,
      ultimaCompra: ultima?.finalizado_em
        ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
            ultima.finalizado_em,
          )
        : null,
    };
  }

  const abasComRotulo = abas.map((aba) => ({
    id: aba.id,
    total: aba.total,
    status: aba.status,
    clienteNome: aba.cliente?.nome ?? null,
  }));


  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="hidden lg:block">
        <h1 className="text-2xl font-semibold tracking-tight">PDV</h1>
        <p className="text-sm text-texto-secundario">
          Várias vendas podem ficar abertas ao mesmo tempo. Só a aba em foco
          recebe os itens.
        </p>
      </div>

      <BarraAbas abas={abasComRotulo} focoId={focoId} />

      {!venda ? (
        <p className="text-sm text-texto-secundario">
          Nenhuma venda em andamento. Clique em &quot;Nova venda&quot; para
          começar.
        </p>
      ) : (
        <>
          <ClienteVenda
            vendaId={venda.id}
            cliente={venda.cliente}
            historico={historicoCliente}
          />

          <div className="hidden items-center justify-between gap-3 lg:flex">
            <p className="text-sm text-texto-secundario">
              Venda #{venda.id} em foco
            </p>
            <div className="flex flex-wrap gap-2">
              {venda.venda_item.length > 0 ? (
                <PagamentoModal
                  vendaId={venda.id}
                  total={Number(venda.total)}
                  formas={formasModal}
                  taxas={taxas}
                />
              ) : null}
              <CancelarVendaButton id={venda.id} />
            </div>
          </div>

          <div className="flex flex-col gap-6 pb-28 lg:grid lg:grid-cols-2 lg:gap-6 lg:pb-0">
            <PdvBuscaProduto vendaId={venda.id} />

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-medium">Itens da venda</h2>
              {venda.venda_item.length === 0 ? (
                <p className="text-sm text-texto-secundario">
                  Nenhum item adicionado ainda.
                </p>
              ) : (
                <>
                  <ul className="flex flex-col gap-3 md:hidden">
                    {venda.venda_item.map((item) => (
                      <li key={item.id}>
                        <CardRegistro
                          acoes={
                            <RemoverItemButton
                              id={item.id}
                              nome={item.produto.nome}
                            />
                          }
                        >
                          <p className="font-medium text-texto-primario">
                            {item.vendido_em_pacote
                              ? linhaItemVenda(item.produto.nome, item)
                              : item.produto.nome}
                          </p>
                          {item.vendido_em_pacote ? null : (
                            <>
                              <p className="font-data text-sm text-texto-primario">
                                {formatarQuantidade(item.quantidade)} ×{" "}
                                {formatarPreco(item.preco_unitario)}
                              </p>
                              <p className="font-data text-sm text-texto-secundario">
                                Subtotal {formatarPreco(item.subtotal)}
                              </p>
                            </>
                          )}
                        </CardRegistro>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                        <tr>
                          <th className="px-3 py-2 font-medium">Produto</th>
                          <th className="px-3 py-2 font-medium">Qtd</th>
                          <th className="px-3 py-2 font-medium">Preço unitário</th>
                          <th className="px-3 py-2 font-medium">Subtotal</th>
                          <th className="px-3 py-2 font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {venda.venda_item.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-zinc-100 last:border-0"
                          >
                            <td className="px-3 py-2">
                              {item.vendido_em_pacote
                                ? linhaItemVenda(item.produto.nome, item)
                                : item.produto.nome}
                            </td>
                            <td className="px-3 py-2 font-data">
                              {rotuloQuantidadeItem(item)}
                            </td>
                            <td className="px-3 py-2 font-data">
                              {item.vendido_em_pacote
                                ? "—"
                                : formatarPreco(item.preco_unitario)}
                            </td>
                            <td className="px-3 py-2 font-data">
                              {formatarPreco(item.subtotal)}
                            </td>
                            <td className="px-3 py-2">
                              <RemoverItemButton
                                id={item.id}
                                nome={item.produto.nome}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <p className="hidden text-lg font-semibold lg:block">
                Total:{" "}
                <span className="font-data">{formatarPreco(venda.total)}</span>
              </p>
            </section>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-superficie p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0">
                <span className="block text-xs text-texto-secundario">
                  Venda #{venda.id}
                </span>
                <span className="font-data text-lg font-semibold">
                  {formatarPreco(venda.total)}
                </span>
              </p>
              <div className="flex shrink-0 gap-2">
                <CancelarVendaButton id={venda.id} />
                {venda.venda_item.length > 0 ? (
                  <PagamentoModal
                    vendaId={venda.id}
                    total={Number(venda.total)}
                    formas={formasModal}
                    taxas={taxas}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
