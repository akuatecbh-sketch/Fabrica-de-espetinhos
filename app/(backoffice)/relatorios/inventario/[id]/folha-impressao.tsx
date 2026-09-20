import { formatarQuantidadeInventario } from "@/lib/inventario";

type ItemFolha = {
  id: number;
  nome: string;
  categoria: string;
  estoqueSistema: number;
  vendidoPorPeso: boolean;
};

export function FolhaImpressaoInventario({
  descricao,
  data,
  criadoPor,
  itens,
}: {
  descricao: string;
  data: string;
  criadoPor: string;
  itens: ItemFolha[];
}) {
  return (
    <section className="print-apenas inventario-folha">
      <header className="inventario-folha-cabecalho">
        <h1>{descricao}</h1>
        <p>
          Data: {data}
          <span aria-hidden> · </span>
          Criado por: {criadoPor}
        </p>
        <p>
          {itens.length} {itens.length === 1 ? "item" : "itens"} · preencha à
          caneta a quantidade contada e marque OK ou Divergência
        </p>
      </header>

      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Categoria</th>
            <th>Qtd. sistema</th>
            <th>Quantidade contada</th>
            <th>Conferência</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id}>
              <td>{item.nome}</td>
              <td>{item.categoria}</td>
              <td className="inventario-folha-numero">
                {formatarQuantidadeInventario(
                  item.estoqueSistema,
                  item.vendidoPorPeso,
                )}
              </td>
              <td>
                <span className="inventario-folha-campo" />
              </td>
              <td>
                <span className="inventario-folha-marcas">
                  <span className="inventario-folha-marca">
                    <span className="inventario-folha-quadrado" aria-hidden />
                    OK
                  </span>
                  <span className="inventario-folha-marca">
                    <span className="inventario-folha-quadrado" aria-hidden />
                    Divergência
                  </span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
