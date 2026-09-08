"use client";

import { useState } from "react";
import { BuscaAutocomplete } from "@/components/busca-autocomplete";
import { AdicionarItemPedidoForm } from "./adicionar-item-form";
import { buscarProdutosPedido, type ProdutoPedidoBusca } from "./actions";

function detalheProduto(produto: ProdutoPedidoBusca) {
  const partes = [produto.codigo, produto.codigo_barras].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : null;
}

export function PedidoBuscaProduto({ pedidoId }: { pedidoId: number | null }) {
  const [produto, setProduto] = useState<ProdutoPedidoBusca | null>(null);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Buscar produto</h2>
      <BuscaAutocomplete
        buscar={buscarProdutosPedido}
        label="Produto"
        placeholder="Nome, código ou código de barras"
        chave={(item) => item.id}
        rotulo={(item) => item.nome}
        descricao={detalheProduto}
        aoSelecionar={setProduto}
        aoAlterar={() => setProduto(null)}
      />
      {produto ? (
        <div className="rounded border border-zinc-200 bg-white px-3 py-2">
          <AdicionarItemPedidoForm
            key={produto.id}
            pedidoId={pedidoId}
            produto={{
              id: produto.id,
              nome: produto.nome,
              codigo: produto.codigo,
              preco_venda: produto.preco_venda,
              unidade: produto.unidade,
              permite_venda_pacote: produto.permite_venda_pacote,
              quantidade_por_pacote: produto.quantidade_por_pacote,
              preco_pacote: produto.preco_pacote,
            }}
          />
        </div>
      ) : (
        <p className="text-sm text-texto-secundario">
          Digite pelo menos 2 caracteres para buscar um produto.
        </p>
      )}
    </section>
  );
}
