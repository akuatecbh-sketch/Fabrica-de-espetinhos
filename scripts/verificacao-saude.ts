import "dotenv/config";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PERFIS } from "@/lib/acesso";
import { arredondarDinheiro, arredondarQuantidade } from "@/lib/dinheiro";
import { dataLocalISO, dataUtcMeiaNoite } from "@/lib/financeiro";
import { TIPOS_VENDA } from "@/lib/produto-tipo";
import { resolverTaxa } from "@/lib/taxa";

type Resultado = "ok" | "aviso" | "erro";

type ItemResultado = {
  codigo: string;
  titulo: string;
  categoria: "integridade" | "fluxo_sintetico";
  resultado: Resultado;
  mensagem: string;
  correcao_aplicada: boolean;
  detalhes?: Prisma.InputJsonValue;
};

const VALOR_CAIXA_SINTETICO = 888888.88;
const MARCA_SINTETICO = "SAUDE_SINTETICO";

class RollbackSaude extends Error {
  constructor() {
    super("ROLLBACK_SAUDE_SINTETICO");
    this.name = "RollbackSaude";
  }
}

function numero(valor: unknown) {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function dinheiroDiverge(a: number, b: number) {
  return Math.abs(arredondarDinheiro(a) - arredondarDinheiro(b)) > 0.009;
}

function quantidadeDiverge(a: number, b: number) {
  return Math.abs(arredondarQuantidade(a) - arredondarQuantidade(b)) > 0.0005;
}

function ehRollbackProposito(erro: unknown): boolean {
  let atual: unknown = erro;
  for (let i = 0; i < 6; i += 1) {
    if (atual instanceof RollbackSaude) return true;
    if (atual instanceof Error && atual.message.includes("ROLLBACK_SAUDE_SINTETICO")) {
      return true;
    }
    if (atual && typeof atual === "object" && "cause" in atual) {
      atual = (atual as { cause: unknown }).cause;
      continue;
    }
    break;
  }
  return false;
}

function mensagemErro(erro: unknown) {
  if (erro instanceof Error) return erro.message;
  return String(erro);
}

async function registrarItem(execucaoId: number, item: ItemResultado) {
  await prisma.verificacao_saude_item.create({
    data: {
      execucao_id: execucaoId,
      codigo: item.codigo,
      titulo: item.titulo,
      categoria: item.categoria,
      resultado: item.resultado,
      mensagem: item.mensagem,
      correcao_aplicada: item.correcao_aplicada,
      ...(item.detalhes != null ? { detalhes: item.detalhes } : {}),
    },
  });
  const marca =
    item.resultado === "ok" ? "OK" : item.resultado === "aviso" ? "AVISO" : "ERRO";
  const correcao = item.correcao_aplicada ? " [correção aplicada]" : "";
  console.log(`  [${marca}] ${item.titulo}${correcao} — ${item.mensagem}`);
}

async function estoqueDivergenteDoHistorico(): Promise<ItemResultado> {
  const linhas = await prisma.$queryRaw<
    {
      id: number;
      nome: string;
      estoque_atual: unknown;
      saldo_historico: unknown;
      qtd_movimentos: bigint;
    }[]
  >`
    SELECT
      p.id,
      p.nome,
      p.estoque_atual,
      COALESCE(SUM(
        CASE
          WHEN m.tipo IN ('entrada_compra', 'ajuste_positivo', 'producao_geracao') THEN m.quantidade
          WHEN m.tipo IN ('saida_venda', 'ajuste_negativo', 'producao_consumo', 'perda') THEN -m.quantidade
          ELSE 0
        END
      ), 0) AS saldo_historico,
      COUNT(m.id) AS qtd_movimentos
    FROM produto p
    LEFT JOIN movimentacao_estoque m ON m.produto_id = p.id
    GROUP BY p.id, p.nome, p.estoque_atual
  `;

  const corrigidos: { id: number; nome: string; antes: number; depois: number }[] =
    [];
  const semHistorico: { id: number; nome: string; estoque_atual: number }[] = [];

  for (const linha of linhas) {
    const atual = numero(linha.estoque_atual);
    const historico = arredondarQuantidade(numero(linha.saldo_historico));
    const movimentos = Number(linha.qtd_movimentos);
    if (!quantidadeDiverge(atual, historico)) continue;

    if (movimentos === 0) {
      semHistorico.push({
        id: linha.id,
        nome: linha.nome,
        estoque_atual: atual,
      });
      continue;
    }

    await prisma.produto.update({
      where: { id: linha.id },
      data: { estoque_atual: historico },
    });
    corrigidos.push({
      id: linha.id,
      nome: linha.nome,
      antes: atual,
      depois: historico,
    });
  }

  if (corrigidos.length === 0 && semHistorico.length === 0) {
    return {
      codigo: "estoque_historico",
      titulo: "Estoque divergente do histórico",
      categoria: "integridade",
      resultado: "ok",
      mensagem: "Todos os produtos com histórico batem com estoque_atual.",
      correcao_aplicada: false,
    };
  }

  const partes: string[] = [];
  if (corrigidos.length > 0) {
    partes.push(
      `${corrigidos.length} produto(s) corrigido(s) com o saldo do histórico.`,
    );
  }
  if (semHistorico.length > 0) {
    partes.push(
      `${semHistorico.length} produto(s) com estoque ≠ 0 e nenhuma movimentação (não corrigido: não há histórico como fonte de verdade).`,
    );
  }

  return {
    codigo: "estoque_historico",
    titulo: "Estoque divergente do histórico",
    categoria: "integridade",
    resultado: semHistorico.length > 0 ? "aviso" : "ok",
    mensagem: partes.join(" "),
    correcao_aplicada: corrigidos.length > 0,
    detalhes: { corrigidos: corrigidos.slice(0, 30), semHistorico: semHistorico.slice(0, 30) },
  };
}

async function totalVendaDivergente(): Promise<ItemResultado> {
  const linhas = await prisma.$queryRaw<
    {
      id: number;
      numero: number;
      total: unknown;
      desconto: unknown;
      soma_itens: unknown;
    }[]
  >`
    SELECT
      v.id,
      v.numero,
      v.total,
      v.desconto,
      COALESCE(SUM(i.subtotal), 0) AS soma_itens
    FROM venda v
    LEFT JOIN venda_item i ON i.venda_id = v.id
    WHERE v.status = 'finalizada'
    GROUP BY v.id, v.numero, v.total, v.desconto
  `;

  const corrigidas: {
    id: number;
    numero: number;
    antes: number;
    depois: number;
  }[] = [];

  for (const linha of linhas) {
    const somaItens = arredondarDinheiro(numero(linha.soma_itens));
    const desconto = arredondarDinheiro(numero(linha.desconto));
    const totalCorreto = arredondarDinheiro(somaItens - desconto);
    const totalAtual = numero(linha.total);
    if (!dinheiroDiverge(totalAtual, totalCorreto)) continue;

    await prisma.venda.update({
      where: { id: linha.id },
      data: { subtotal: somaItens, total: totalCorreto },
    });
    corrigidas.push({
      id: linha.id,
      numero: linha.numero,
      antes: totalAtual,
      depois: totalCorreto,
    });
  }

  if (corrigidas.length === 0) {
    return {
      codigo: "venda_total",
      titulo: "Total de venda divergente dos itens",
      categoria: "integridade",
      resultado: "ok",
      mensagem: "Totais das vendas finalizadas batem com a soma dos itens.",
      correcao_aplicada: false,
    };
  }

  return {
    codigo: "venda_total",
    titulo: "Total de venda divergente dos itens",
    categoria: "integridade",
    resultado: "ok",
    mensagem: `${corrigidas.length} venda(s) finalizada(s) tiveram o total recalculado.`,
    correcao_aplicada: true,
    detalhes: { corrigidas: corrigidas.slice(0, 30) },
  };
}

async function caixaAbertoHaMuitoTempo(): Promise<ItemResultado> {
  const limite = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const abertos = await prisma.caixa.findMany({
    where: { status: "aberto", data_abertura: { lt: limite } },
    select: { id: true, data_abertura: true, valor_abertura: true },
  });

  if (abertos.length === 0) {
    return {
      codigo: "caixa_aberto_longo",
      titulo: "Caixa aberto há muito tempo",
      categoria: "integridade",
      resultado: "ok",
      mensagem: "Nenhum caixa aberto há mais de 20 horas.",
      correcao_aplicada: false,
    };
  }

  return {
    codigo: "caixa_aberto_longo",
    titulo: "Caixa aberto há muito tempo",
    categoria: "integridade",
    resultado: "aviso",
    mensagem: `${abertos.length} caixa(s) aberto(s) há mais de 20 horas. Revisão humana (não corrige fechamento/dinheiro).`,
    correcao_aplicada: false,
    detalhes: abertos.map((caixa) => ({
      id: caixa.id,
      data_abertura: caixa.data_abertura.toISOString(),
      horas_aberto: Math.round(
        (Date.now() - caixa.data_abertura.getTime()) / 36e5,
      ),
    })),
  };
}

async function vendaParada(): Promise<ItemResultado> {
  const limite = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const paradas = await prisma.venda.findMany({
    where: {
      status: { in: ["aberta", "em_espera"] },
      atualizado_em: { lt: limite },
    },
    select: { id: true, numero: true, status: true, atualizado_em: true },
  });

  if (paradas.length === 0) {
    return {
      codigo: "venda_parada",
      titulo: "Venda parada",
      categoria: "integridade",
      resultado: "ok",
      mensagem: "Nenhuma venda aberta/em espera parada há mais de 12 horas.",
      correcao_aplicada: false,
    };
  }

  return {
    codigo: "venda_parada",
    titulo: "Venda parada",
    categoria: "integridade",
    resultado: "aviso",
    mensagem: `${paradas.length} venda(s) aberta(s) ou em espera sem atualização há mais de 12 horas.`,
    correcao_aplicada: false,
    detalhes: paradas.slice(0, 30).map((venda) => ({
      id: venda.id,
      numero: venda.numero,
      status: venda.status,
      atualizado_em: venda.atualizado_em.toISOString(),
    })),
  };
}

async function estoqueNegativo(): Promise<ItemResultado> {
  const negativos = await prisma.produto.findMany({
    where: { estoque_atual: { lt: 0 } },
    select: { id: true, nome: true, estoque_atual: true },
  });

  if (negativos.length === 0) {
    return {
      codigo: "estoque_negativo",
      titulo: "Estoque negativo",
      categoria: "integridade",
      resultado: "ok",
      mensagem: "Nenhum produto com estoque_atual negativo.",
      correcao_aplicada: false,
    };
  }

  return {
    codigo: "estoque_negativo",
    titulo: "Estoque negativo",
    categoria: "integridade",
    resultado: "erro",
    mensagem: `${negativos.length} produto(s) com estoque negativo. Não corrigido — investigar baixa duplicada ou ajuste indevido.`,
    correcao_aplicada: false,
    detalhes: negativos.slice(0, 30).map((produto) => ({
      id: produto.id,
      nome: produto.nome,
      estoque_atual: numero(produto.estoque_atual),
    })),
  };
}

async function contaVencidaAindaAberta(): Promise<ItemResultado> {
  const corte = dataUtcMeiaNoite(dataLocalISO());
  const [pagar, receber] = await Promise.all([
    prisma.conta_pagar.findMany({
      where: { status: "aberta", data_vencimento: { lt: corte } },
      select: { id: true, descricao: true, data_vencimento: true },
    }),
    prisma.conta_receber.findMany({
      where: { status: "aberta", data_vencimento: { lt: corte } },
      select: { id: true, descricao: true, data_vencimento: true },
    }),
  ]);

  if (pagar.length === 0 && receber.length === 0) {
    return {
      codigo: "conta_vencida",
      titulo: "Conta vencida ainda como aberta",
      categoria: "integridade",
      resultado: "ok",
      mensagem: "Nenhuma conta aberta com vencimento no passado.",
      correcao_aplicada: false,
    };
  }

  if (pagar.length > 0) {
    await prisma.conta_pagar.updateMany({
      where: { id: { in: pagar.map((conta) => conta.id) } },
      data: { status: "atrasada" },
    });
  }
  if (receber.length > 0) {
    await prisma.conta_receber.updateMany({
      where: { id: { in: receber.map((conta) => conta.id) } },
      data: { status: "atrasada" },
    });
  }

  return {
    codigo: "conta_vencida",
    titulo: "Conta vencida ainda como aberta",
    categoria: "integridade",
    resultado: "ok",
    mensagem: `${pagar.length} conta(s) a pagar e ${receber.length} conta(s) a receber atualizadas para atrasada.`,
    correcao_aplicada: true,
    detalhes: {
      pagar: pagar.slice(0, 20).map((conta) => conta.id),
      receber: receber.slice(0, 20).map((conta) => conta.id),
    },
  };
}

async function usuarioIntegridade(): Promise<ItemResultado> {
  const [usuarios, funcionarios] = await Promise.all([
    prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        perfil: true,
        ativo: true,
        funcionario: { select: { id: true } },
      },
    }),
    prisma.funcionario.findMany({
      where: { usuario_id: { not: null } },
      select: { id: true, usuario_id: true, nome: true },
    }),
  ]);

  const problemas: string[] = [];
  const detalhes: Record<string, unknown> = {};

  const perfilInvalido = usuarios.filter(
    (usuario) => !(PERFIS as readonly string[]).includes(usuario.perfil),
  );
  if (perfilInvalido.length > 0) {
    problemas.push(
      `${perfilInvalido.length} usuário(s) com perfil fora da lista válida.`,
    );
    detalhes.perfilInvalido = perfilInvalido.map((usuario) => ({
      id: usuario.id,
      perfil: usuario.perfil,
    }));
  }

  const operadoresSemFuncionario = usuarios.filter(
    (usuario) =>
      usuario.ativo &&
      usuario.perfil === "operador_pdv" &&
      usuario.funcionario.length === 0,
  );
  if (operadoresSemFuncionario.length > 0) {
    problemas.push(
      `${operadoresSemFuncionario.length} operador(es) PDV ativo(s) sem funcionário vinculado.`,
    );
    detalhes.operadoresSemFuncionario = operadoresSemFuncionario.map(
      (usuario) => usuario.id,
    );
  }

  const porUsuario = new Map<number, number[]>();
  for (const funcionario of funcionarios) {
    const usuarioId = funcionario.usuario_id;
    if (usuarioId == null) continue;
    const lista = porUsuario.get(usuarioId) ?? [];
    lista.push(funcionario.id);
    porUsuario.set(usuarioId, lista);
  }
  const duplicados = [...porUsuario.entries()].filter(
    ([, ids]) => ids.length > 1,
  );
  if (duplicados.length > 0) {
    problemas.push(
      `${duplicados.length} usuário(s) vinculados a mais de um funcionário.`,
    );
    detalhes.usuarioDuplicadoEmFuncionario = duplicados.map(
      ([usuario_id, funcionario_ids]) => ({ usuario_id, funcionario_ids }),
    );
  }

  if (problemas.length === 0) {
    return {
      codigo: "usuario_integridade",
      titulo: "Integridade de usuário / funcionário",
      categoria: "integridade",
      resultado: "ok",
      mensagem: "Perfis válidos e vínculos de funcionário consistentes.",
      correcao_aplicada: false,
    };
  }

  const temErro = perfilInvalido.length > 0 || duplicados.length > 0;
  return {
    codigo: "usuario_integridade",
    titulo: "Integridade de usuário / funcionário",
    categoria: "integridade",
    resultado: temErro ? "erro" : "aviso",
    mensagem: problemas.join(" "),
    correcao_aplicada: false,
    detalhes: detalhes as Prisma.InputJsonValue,
  };
}

async function fluxoSinteticoPontaAPonta(): Promise<ItemResultado> {
  const operador = await prisma.usuario.findFirst({
    where: { ativo: true },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  if (!operador) {
    return {
      codigo: "fluxo_pdv_sintetico",
      titulo: "Fluxo sintético ponta a ponta",
      categoria: "fluxo_sintetico",
      resultado: "erro",
      mensagem: "Não há usuário ativo para simular o PDV.",
      correcao_aplicada: false,
    };
  }

  const produto = await prisma.produto.findFirst({
    where: {
      ativo: true,
      tipo: { in: [...TIPOS_VENDA] },
      preco_venda: { gt: 0 },
    },
    select: {
      id: true,
      nome: true,
      preco_venda: true,
      estoque_atual: true,
      controla_estoque: true,
    },
  });
  if (!produto || produto.preco_venda == null) {
    return {
      codigo: "fluxo_pdv_sintetico",
      titulo: "Fluxo sintético ponta a ponta",
      categoria: "fluxo_sintetico",
      resultado: "erro",
      mensagem: "Não há produto ativo vendável com preço para simular o PDV.",
      correcao_aplicada: false,
    };
  }

  const formas = await prisma.forma_pagamento.findMany({
    orderBy: { id: "asc" },
  });
  if (formas.length === 0) {
    return {
      codigo: "fluxo_pdv_sintetico",
      titulo: "Fluxo sintético ponta a ponta",
      categoria: "fluxo_sintetico",
      resultado: "erro",
      mensagem: "Não há forma de pagamento cadastrada para simular o PDV.",
      correcao_aplicada: false,
    };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const taxas = (
          await tx.taxa_cartao.findMany({
            where: { vigencia_fim: null },
            orderBy: [{ forma_pagamento_id: "asc" }, { numero_parcelas: "asc" }],
          })
        ).map((taxa) => ({
          id: taxa.id,
          forma_pagamento_id: taxa.forma_pagamento_id,
          numero_parcelas: taxa.numero_parcelas,
          percentual: Number(taxa.percentual),
        }));

        const formaComTaxa = formas.find((forma) =>
          taxas.some((taxa) => taxa.forma_pagamento_id === forma.id),
        );
        const forma =
          formaComTaxa ??
          formas.find((item) => item.tipo === "dinheiro") ??
          formas[0];

        const caixa = await tx.caixa.create({
          data: {
            usuario_abertura_id: operador.id,
            valor_abertura: VALOR_CAIXA_SINTETICO,
            status: "aberto",
          },
        });

        const quantidade = 1;
        const preco_unitario = arredondarDinheiro(Number(produto.preco_venda));
        const subtotal = arredondarDinheiro(quantidade * preco_unitario);
        const desconto = 0;
        const total = arredondarDinheiro(subtotal - desconto);

        const venda = await tx.venda.create({
          data: {
            caixa_id: caixa.id,
            operador_id: operador.id,
            status: "aberta",
            aba_rotulo: MARCA_SINTETICO,
            subtotal,
            desconto,
            total,
          },
        });

        await tx.venda_item.create({
          data: {
            venda_id: venda.id,
            produto_id: produto.id,
            quantidade,
            preco_unitario,
            desconto: 0,
            subtotal,
          },
        });

        const estoqueSimulado = produto.controla_estoque
          ? arredondarQuantidade(numero(produto.estoque_atual) - quantidade)
          : numero(produto.estoque_atual);
        if (!Number.isFinite(estoqueSimulado)) {
          throw new Error("Falha ao simular saldo de estoque em memória.");
        }

        const ehDinheiro = forma.tipo === "dinheiro";
        const valorPago = ehDinheiro
          ? arredondarDinheiro(total + 5)
          : total;
        const troco = ehDinheiro ? arredondarDinheiro(valorPago - total) : 0;
        const numero_parcelas = 1;
        const taxa = resolverTaxa({
          tipo: forma.tipo,
          formaPagamentoId: forma.id,
          numeroParcelas: numero_parcelas,
          taxas,
        });
        const valor_taxa = arredondarDinheiro((valorPago * taxa.percentual) / 100);
        const valor_liquido = arredondarDinheiro(valorPago - valor_taxa);

        if (dinheiroDiverge(subtotal, quantidade * preco_unitario)) {
          throw new Error("Subtotal sintético divergente.");
        }
        if (dinheiroDiverge(total, subtotal - desconto)) {
          throw new Error("Total sintético divergente.");
        }
        if (dinheiroDiverge(valor_liquido, valorPago - valor_taxa)) {
          throw new Error("Valor líquido sintético divergente.");
        }
        if (ehDinheiro && dinheiroDiverge(troco, 5)) {
          throw new Error("Troco sintético divergente.");
        }

        await tx.venda_pagamento.create({
          data: {
            venda_id: venda.id,
            forma_pagamento_id: forma.id,
            valor: valorPago,
            troco,
            status: "confirmado",
            numero_parcelas,
            taxa_cartao_id: taxa.taxa_cartao_id,
            taxa_percentual_aplicada: taxa.percentual,
            valor_taxa,
            valor_liquido,
          },
        });

        throw new RollbackSaude();
      },
      { timeout: 30000, maxWait: 10000 },
    );

    return {
      codigo: "fluxo_pdv_sintetico",
      titulo: "Fluxo sintético ponta a ponta",
      categoria: "fluxo_sintetico",
      resultado: "erro",
      mensagem: "A transação sintética concluiu sem o rollback proposital.",
      correcao_aplicada: false,
    };
  } catch (erro) {
    if (!ehRollbackProposito(erro)) {
      return {
        codigo: "fluxo_pdv_sintetico",
        titulo: "Fluxo sintético ponta a ponta",
        categoria: "fluxo_sintetico",
        resultado: "erro",
        mensagem: `Falha inesperada no fluxo do PDV: ${mensagemErro(erro)}`,
        correcao_aplicada: false,
      };
    }
  }

  const vazou = await prisma.caixa.findFirst({
    where: { valor_abertura: VALOR_CAIXA_SINTETICO },
    select: { id: true },
  });
  const vendaVazada = await prisma.venda.findFirst({
    where: { aba_rotulo: MARCA_SINTETICO },
    select: { id: true },
  });
  if (vazou || vendaVazada) {
    return {
      codigo: "fluxo_pdv_sintetico",
      titulo: "Fluxo sintético ponta a ponta",
      categoria: "fluxo_sintetico",
      resultado: "erro",
      mensagem: "Rollback falhou: registros sintéticos persistiram no banco.",
      correcao_aplicada: false,
    };
  }

  return {
    codigo: "fluxo_pdv_sintetico",
    titulo: "Fluxo sintético ponta a ponta",
    categoria: "fluxo_sintetico",
    resultado: "ok",
    mensagem:
      "Fluxo de caixa, venda, item, taxa e pagamento simulado com sucesso; rollback removeu todos os registros.",
    correcao_aplicada: false,
  };
}

async function finalizar(
  execucaoId: number,
  itens: ItemResultado[],
  statusForcado?: "erro",
) {
  const total_verificacoes = itens.length;
  const total_ok = itens.filter((item) => item.resultado === "ok").length;
  const total_avisos = itens.filter((item) => item.resultado === "aviso").length;
  const total_erros = itens.filter((item) => item.resultado === "erro").length;
  const correcoes_aplicadas = itens.filter((item) => item.correcao_aplicada).length;
  const status_geral: "ok" | "atencao" | "erro" =
    statusForcado === "erro" || total_erros > 0
      ? "erro"
      : total_avisos > 0
        ? "atencao"
        : "ok";

  await prisma.verificacao_saude_execucao.update({
    where: { id: execucaoId },
    data: {
      finalizado_em: new Date(),
      total_verificacoes,
      total_ok,
      total_avisos,
      total_erros,
      correcoes_aplicadas,
      status_geral,
    },
  });

  return { status_geral, total_verificacoes, total_ok, total_avisos, total_erros, correcoes_aplicadas };
}

async function main() {
  console.log("Verificação de saúde — início");
  const execucao = await prisma.verificacao_saude_execucao.create({
    data: { iniciado_em: new Date() },
  });
  const itens: ItemResultado[] = [];

  const checagens: Array<() => Promise<ItemResultado>> = [
    estoqueDivergenteDoHistorico,
    totalVendaDivergente,
    caixaAbertoHaMuitoTempo,
    vendaParada,
    estoqueNegativo,
    contaVencidaAindaAberta,
    usuarioIntegridade,
    fluxoSinteticoPontaAPonta,
  ];

  try {
    for (const checagem of checagens) {
      const item = await checagem();
      itens.push(item);
      await registrarItem(execucao.id, item);
    }
    const resumo = await finalizar(execucao.id, itens);
    console.log(
      `Verificação de saúde — fim (execucao #${execucao.id}, status ${resumo.status_geral}, correções ${resumo.correcoes_aplicadas})`,
    );
    if (resumo.status_geral === "erro") process.exitCode = 1;
  } catch (erro) {
    console.error("Falha geral na verificação de saúde:", mensagemErro(erro));
    await finalizar(execucao.id, itens, "erro");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
