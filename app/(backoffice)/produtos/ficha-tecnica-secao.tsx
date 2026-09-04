import {
  adicionarInsumoFicha,
  atualizarQuantidadeFicha,
} from "./ficha-tecnica-actions";
import { AdicionarInsumoForm } from "./adicionar-insumo-form";
import { QuantidadeInsumoForm } from "./quantidade-insumo-form";
import { RemoverInsumoButton } from "./remover-insumo-button";

type ItemFicha = {
  id: number;
  quantidade: { toString(): string };
  insumo: {
    id: number;
    nome: string;
    unidade: string;
  };
};

type InsumoOpcao = {
  id: number;
  nome: string;
  unidade: string;
};

export function FichaTecnicaSecao({
  produtoId,
  itens,
  insumos,
}: {
  produtoId: number;
  itens: ItemFicha[];
  insumos: InsumoOpcao[];
}) {
  const adicionar = adicionarInsumoFicha.bind(null, produtoId);

  return (
    <section className="flex max-w-3xl flex-col gap-4 border-t border-zinc-200 pt-6">
      <div>
        <h2 className="text-lg font-medium">Ficha técnica</h2>
        <p className="text-sm text-zinc-600">
          Insumos e embalagens consumidos por unidade deste produto.
        </p>
      </div>

      {itens.length === 0 ? (
        <p className="text-sm text-zinc-600">
          Nenhum insumo vinculado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-3 py-2 font-medium">Insumo</th>
                <th className="px-3 py-2 font-medium">Quantidade</th>
                <th className="px-3 py-2 font-medium">Unidade</th>
                <th className="px-3 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => {
                const atualizar = atualizarQuantidadeFicha.bind(
                  null,
                  item.id,
                  produtoId,
                );
                return (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-3 py-2">{item.insumo.nome}</td>
                    <td className="px-3 py-2">
                      <QuantidadeInsumoForm
                        action={atualizar}
                        quantidade={item.quantidade.toString()}
                      />
                    </td>
                    <td className="px-3 py-2">{item.insumo.unidade}</td>
                    <td className="px-3 py-2">
                      <RemoverInsumoButton
                        fichaId={item.id}
                        produtoFinalId={produtoId}
                        nome={item.insumo.nome}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AdicionarInsumoForm action={adicionar} insumos={insumos} />
    </section>
  );
}
