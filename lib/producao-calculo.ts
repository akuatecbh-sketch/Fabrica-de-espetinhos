import { arredondarCusto, arredondarQuantidade } from "@/lib/dinheiro";

export type InsumoParaPlano = {
  insumoId: number;
  nome: string;
  unidade: string;
  quantidadeFicha: number;
  controlaEstoque: boolean;
  estoqueAtual: number;
  custoUnitario: number;
};

export type LinhaPlanoProducao = {
  insumoId: number;
  nome: string;
  unidade: string;
  quantidadeFicha: number;
  quantidadeBaixa: number;
  controlaEstoque: boolean;
  custoUnitario: number;
  custoTotal: number;
  saldoAtual: number | null;
  saldoDepois: number | null;
};

export type PlanoProducao = {
  quantidadeProduzida: number;
  linhas: LinhaPlanoProducao[];
  custoTotal: number;
  temSaldoNegativo: boolean;
};

export type ItemCancelamento = {
  insumoId: number;
  nome: string;
  unidade: string;
  quantidade: number;
  controlaEstoque: boolean;
  estoqueAtual: number;
};

export type LinhaPlanoCancelamento = {
  insumoId: number;
  nome: string;
  unidade: string;
  quantidade: number;
  controlaEstoque: boolean;
  saldoAtual: number | null;
  saldoDepois: number | null;
};

export type PlanoCancelamento = {
  quantidadeProduzida: number;
  produtoFinal: {
    id: number;
    nome: string;
    unidade: string;
    controlaEstoque: boolean;
    quantidade: number;
    saldoAtual: number | null;
    saldoDepois: number | null;
  };
  linhas: LinhaPlanoCancelamento[];
  temSaldoNegativoProduto: boolean;
};

export function calcularQuantidadeBaixa(
  quantidadeFicha: number,
  quantidadeProduzida: number,
) {
  return arredondarQuantidade(
    Number(quantidadeFicha) * Number(quantidadeProduzida),
  );
}

export function montarPlanoProducao(
  quantidadeProduzida: number,
  insumos: InsumoParaPlano[],
): PlanoProducao {
  const quantidade = arredondarQuantidade(quantidadeProduzida);
  const linhas: LinhaPlanoProducao[] = [];
  let custoTotal = 0;
  let temSaldoNegativo = false;

  for (const insumo of insumos) {
    const quantidadeBaixa = calcularQuantidadeBaixa(
      insumo.quantidadeFicha,
      quantidade,
    );
    const custoUnitario = arredondarCusto(Number(insumo.custoUnitario) || 0);
    const custoLinha = arredondarCusto(custoUnitario * quantidadeBaixa);
    custoTotal = arredondarCusto(custoTotal + custoLinha);

    if (insumo.controlaEstoque) {
      const saldoAtual = arredondarQuantidade(Number(insumo.estoqueAtual));
      const saldoDepois = arredondarQuantidade(saldoAtual - quantidadeBaixa);
      if (saldoDepois < 0) temSaldoNegativo = true;
      linhas.push({
        insumoId: insumo.insumoId,
        nome: insumo.nome,
        unidade: insumo.unidade,
        quantidadeFicha: Number(insumo.quantidadeFicha),
        quantidadeBaixa,
        controlaEstoque: true,
        custoUnitario,
        custoTotal: custoLinha,
        saldoAtual,
        saldoDepois,
      });
    } else {
      linhas.push({
        insumoId: insumo.insumoId,
        nome: insumo.nome,
        unidade: insumo.unidade,
        quantidadeFicha: Number(insumo.quantidadeFicha),
        quantidadeBaixa,
        controlaEstoque: false,
        custoUnitario,
        custoTotal: custoLinha,
        saldoAtual: null,
        saldoDepois: null,
      });
    }
  }

  return {
    quantidadeProduzida: quantidade,
    linhas,
    custoTotal,
    temSaldoNegativo,
  };
}

export function montarPlanoCancelamento(
  quantidadeProduzida: number,
  produtoFinal: {
    id: number;
    nome: string;
    unidade: string;
    controlaEstoque: boolean;
    estoqueAtual: number;
  },
  itens: ItemCancelamento[],
): PlanoCancelamento {
  const quantidade = arredondarQuantidade(quantidadeProduzida);
  let produtoSaldoAtual: number | null = null;
  let produtoSaldoDepois: number | null = null;
  let temSaldoNegativoProduto = false;

  if (produtoFinal.controlaEstoque) {
    produtoSaldoAtual = arredondarQuantidade(Number(produtoFinal.estoqueAtual));
    produtoSaldoDepois = arredondarQuantidade(produtoSaldoAtual - quantidade);
    temSaldoNegativoProduto = produtoSaldoDepois < 0;
  }

  const linhas = itens.map((item) => {
    const qtd = arredondarQuantidade(Number(item.quantidade));
    if (!item.controlaEstoque) {
      return {
        insumoId: item.insumoId,
        nome: item.nome,
        unidade: item.unidade,
        quantidade: qtd,
        controlaEstoque: false,
        saldoAtual: null,
        saldoDepois: null,
      };
    }
    const saldoAtual = arredondarQuantidade(Number(item.estoqueAtual));
    return {
      insumoId: item.insumoId,
      nome: item.nome,
      unidade: item.unidade,
      quantidade: qtd,
      controlaEstoque: true,
      saldoAtual,
      saldoDepois: arredondarQuantidade(saldoAtual + qtd),
    };
  });

  return {
    quantidadeProduzida: quantidade,
    produtoFinal: {
      id: produtoFinal.id,
      nome: produtoFinal.nome,
      unidade: produtoFinal.unidade,
      controlaEstoque: produtoFinal.controlaEstoque,
      quantidade,
      saldoAtual: produtoSaldoAtual,
      saldoDepois: produtoSaldoDepois,
    },
    linhas,
    temSaldoNegativoProduto,
  };
}
