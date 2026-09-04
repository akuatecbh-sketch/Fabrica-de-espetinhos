"use client";

import { useActionState, useState } from "react";
import { BuscaAutocomplete } from "@/components/busca-autocomplete";
import { formatarPreco, rotuloTipo } from "@/lib/format";
import { dataLocalISO, isoDaData } from "@/lib/financeiro";
import { totaisDaNota } from "@/lib/compras";
import {
  buscarProdutosCompra,
  salvarNotaEntrada,
  type CompraFormState,
  type FornecedorOpcao,
  type ProdutoCompraBusca,
} from "./actions";
import { FornecedorCampo } from "./fornecedor-campo";

const estadoInicial: CompraFormState = {};

export type ItemCompra = {
  produto_id: number;
  nome: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
};

export type NotaInicial = {
  id: number;
  fornecedor_id: number;
  numero: string;
  serie: string;
  data_emissao: Date;
  valor_frete: number;
  valor_desconto: number;
  itens: ItemCompra[];
};

export function CompraForm({
  fornecedores,
  nota,
}: {
  fornecedores: FornecedorOpcao[];
  nota?: NotaInicial;
}) {
  const [estado, formAction, pendente] = useActionState(
    salvarNotaEntrada,
    estadoInicial,
  );
  const [itens, setItens] = useState<ItemCompra[]>(nota?.itens ?? []);
  const [frete, setFrete] = useState(String(nota?.valor_frete ?? 0));
  const [desconto, setDesconto] = useState(String(nota?.valor_desconto ?? 0));

  const totais = totaisDaNota(
    itens,
    Number(String(frete).replace(",", ".")) || 0,
    Number(String(desconto).replace(",", ".")) || 0,
  );

  function adicionar(produto: ProdutoCompraBusca) {
    setItens((atuais) => [
      ...atuais,
      {
        produto_id: produto.id,
        nome: produto.nome,
        unidade: produto.unidade,
        quantidade: 1,
        valor_unitario: 0,
      },
    ]);
  }

  function atualizarItem(
    produtoId: number,
    campo: "quantidade" | "valor_unitario",
    valor: string,
  ) {
    const numero = Number(valor.replace(",", "."));
    setItens((atuais) =>
      atuais.map((item) =>
        item.produto_id === produtoId
          ? { ...item, [campo]: Number.isFinite(numero) ? numero : 0 }
          : item,
      ),
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-3xl flex-col gap-6">
      {nota ? <input type="hidden" name="nota_id" value={nota.id} /> : null}
      <input type="hidden" name="itens" value={JSON.stringify(itens)} />

      {estado.error ? (
        <p className="rounded border border-vermelho-erro/40 bg-vermelho-erro/10 px-3 py-2 text-sm text-vermelho-erro">
          {estado.error}
        </p>
      ) : null}

      <FornecedorCampo
        fornecedoresIniciais={fornecedores}
        valorInicial={nota?.fornecedor_id}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Número
          <input
            name="numero"
            required
            maxLength={20}
            defaultValue={nota?.numero ?? ""}
            className="min-h-11 rounded border border-borda px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Série
          <input
            name="serie"
            maxLength={10}
            defaultValue={nota?.serie ?? ""}
            className="min-h-11 rounded border border-borda px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Data de emissão
          <input
            name="data_emissao"
            type="date"
            required
            defaultValue={
              nota ? isoDaData(nota.data_emissao) : dataLocalISO()
            }
            className="min-h-11 rounded border border-borda px-3 py-2"
          />
        </label>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Itens (insumo ou embalagem)</h2>
        <BuscaAutocomplete
          buscar={async (termo) => {
            const lista = await buscarProdutosCompra(termo);
            const ids = new Set(itens.map((item) => item.produto_id));
            return lista.filter((produto) => !ids.has(produto.id));
          }}
          label="Buscar produto"
          placeholder="Nome do insumo ou embalagem"
          chave={(produto) => produto.id}
          rotulo={(produto) => produto.nome}
          descricao={(produto) =>
            [
              rotuloTipo(produto.tipo),
              produto.unidade,
              produto.codigo,
              produto.codigo_barras,
            ]
              .filter(Boolean)
              .join(" · ")
          }
          aoSelecionar={adicionar}
          limparAoSelecionar
        />

        {itens.length === 0 ? (
          <p className="text-sm text-texto-secundario">
            Nenhum item adicionado. Busque um insumo ou embalagem acima.
          </p>
        ) : (
          <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Produto</th>
                  <th className="px-3 py-2 font-medium">Qtd</th>
                  <th className="px-3 py-2 font-medium">Valor unitário</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.produto_id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-3 py-2">
                      {item.nome}
                      <span className="ml-1 text-xs text-texto-secundario">
                        {item.unidade}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.quantidade || ""}
                        onChange={(evento) =>
                          atualizarItem(
                            item.produto_id,
                            "quantidade",
                            evento.target.value,
                          )
                        }
                        className="font-data min-h-11 w-24 rounded border border-borda px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={item.valor_unitario || ""}
                        onChange={(evento) =>
                          atualizarItem(
                            item.produto_id,
                            "valor_unitario",
                            evento.target.value,
                          )
                        }
                        className="font-data min-h-11 w-28 rounded border border-borda px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2 font-data">
                      {formatarPreco(item.quantidade * item.valor_unitario)}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          setItens((atuais) =>
                            atuais.filter(
                              (atual) => atual.produto_id !== item.produto_id,
                            ),
                          )
                        }
                        className="text-red-700 hover:underline"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Frete
          <input
            name="valor_frete"
            type="number"
            min="0"
            step="0.01"
            value={frete}
            onChange={(evento) => setFrete(evento.target.value)}
            className="font-data min-h-11 rounded border border-borda px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Desconto
          <input
            name="valor_desconto"
            type="number"
            min="0"
            step="0.01"
            value={desconto}
            onChange={(evento) => setDesconto(evento.target.value)}
            className="font-data min-h-11 rounded border border-borda px-3 py-2"
          />
        </label>
      </div>

      <dl className="grid grid-cols-1 gap-2 rounded border border-borda bg-superficie p-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-texto-secundario">Produtos</dt>
          <dd className="font-data text-lg font-semibold">
            {formatarPreco(totais.valor_produtos)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-texto-secundario">Frete − desconto</dt>
          <dd className="font-data text-lg font-semibold">
            {formatarPreco(totais.valor_frete - totais.valor_desconto)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-texto-secundario">Total da nota</dt>
          <dd className="font-data text-lg font-semibold">
            {formatarPreco(totais.valor_total)}
          </dd>
        </div>
      </dl>

      {totais.valor_total < 0 ? (
        <p className="text-sm text-vermelho-erro">
          O valor total não pode ser negativo. Ajuste o desconto.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="acao"
          value="rascunho"
          disabled={pendente}
          className="min-h-11 rounded border border-borda bg-superficie px-4 py-2 text-sm font-medium text-texto-primario hover:bg-fundo-hover disabled:opacity-60"
        >
          {pendente ? "Salvando..." : "Salvar como rascunho"}
        </button>
        <button
          type="submit"
          name="acao"
          value="confirmar"
          disabled={pendente || itens.length === 0 || totais.valor_total < 0}
          className="min-h-11 rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pendente ? "Confirmando..." : "Confirmar entrada"}
        </button>
      </div>
    </form>
  );
}
