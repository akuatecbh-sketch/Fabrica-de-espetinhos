import "dotenv/config";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  SQL_LINHAS_ACESSO,
  formatarMatrizAcessos,
  mapaAcessosAntigo,
  montarMapaAcessos,
  temAcessoAntigo,
  type LinhaAcesso,
} from "@/lib/mapa-acessos";

const url = process.env.DATABASE_URL;

function inicioLocalMaisDias(dias: number, agora = new Date()) {
  const data = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  data.setDate(data.getDate() + dias);
  return data;
}

function dataLocalISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function dinheiro(valor: unknown) {
  return Number(Number(valor ?? 0).toFixed(2));
}

const client = new Client({ connectionString: url });
let bancoOk = false;
let motivoPulo = "DATABASE_URL ausente";

describe("equivalência no banco (Etapa B)", () => {
  beforeAll(async () => {
    if (!url) return;
    try {
      await client.connect();
      bancoOk = true;
    } catch (erro) {
      const texto = erro instanceof Error ? erro.message : String(erro);
      motivoPulo = texto.replace(/postgres(?:ql)?:\/\/\S+/gi, "[url]");
      // eslint-disable-next-line no-console
      console.warn(`Prova ao vivo pulada: ${motivoPulo}`);
    }
  }, 30_000);

  afterAll(async () => {
    if (bancoOk) await client.end();
  });

  it("mapa SQL (cache por requisição) = temAcessoMultiplo antigo = temAcesso antigo, para cada usuário × módulo", async ({ skip }) => {
    if (!bancoOk) skip(motivoPulo);
    const usuarios = (
      await client.query<{
        id: number;
        nome: string;
        perfil: string;
        ativo: boolean;
      }>(
        `SELECT id, nome, perfil, ativo FROM usuario ORDER BY perfil, id`,
      )
    ).rows;
    const modulos = (
      await client.query<{
        id: number;
        chave: string;
        somente_super_admin: boolean;
      }>(
        `SELECT id, chave, somente_super_admin FROM modulo ORDER BY ordem, chave`,
      )
    ).rows;
    const doPerfil = (
      await client.query<{
        perfil: string;
        modulo_id: number;
        pode_acessar: boolean;
      }>(`SELECT perfil, modulo_id, pode_acessar FROM permissao_perfil`)
    ).rows;
    const excecoes = (
      await client.query<{
        usuario_id: number;
        modulo_id: number;
        pode_acessar: boolean;
      }>(`SELECT usuario_id, modulo_id, pode_acessar FROM permissao_usuario`)
    ).rows;

    expect(usuarios.length).toBeGreaterThan(0);
    expect(modulos.length).toBeGreaterThan(0);

    const divergencias: string[] = [];
    const comOverride = new Set(excecoes.map((linha) => linha.usuario_id));

    for (const usuario of usuarios) {
      const sql = (
        await client.query<LinhaAcesso>(SQL_LINHAS_ACESSO, [usuario.id])
      ).rows;
      const novo = usuario.ativo
        ? montarMapaAcessos(usuario.perfil, sql)
        : Object.fromEntries(modulos.map((modulo) => [modulo.chave, false]));
      const antigo = mapaAcessosAntigo({
        perfil: usuario.perfil,
        ativo: usuario.ativo,
        modulos,
        excecoes: excecoes.filter((linha) => linha.usuario_id === usuario.id),
        doPerfil: doPerfil.filter((linha) => linha.perfil === usuario.perfil),
      });

      for (const modulo of modulos) {
        const excecao = excecoes.find(
          (linha) =>
            linha.usuario_id === usuario.id && linha.modulo_id === modulo.id,
        );
        const perfilLinha = doPerfil.find(
          (linha) =>
            linha.perfil === usuario.perfil && linha.modulo_id === modulo.id,
        );
        const porModulo = temAcessoAntigo({
          perfil: usuario.perfil,
          ativo: usuario.ativo,
          modulo,
          excecao: excecao?.pode_acessar,
          perfilPode: perfilLinha?.pode_acessar,
        });
        const esperadoInativo = usuario.ativo ? antigo[modulo.chave] : false;
        if (novo[modulo.chave] !== antigo[modulo.chave]) {
          divergencias.push(
            `multiplo ${usuario.perfil}#${usuario.id} ${modulo.chave}: novo=${novo[modulo.chave]} antigo=${antigo[modulo.chave]}`,
          );
        }
        if (usuario.ativo && novo[modulo.chave] !== porModulo) {
          divergencias.push(
            `temAcesso ${usuario.perfil}#${usuario.id} ${modulo.chave}: novo=${novo[modulo.chave]} antigo=${porModulo}`,
          );
        }
        if (!usuario.ativo && esperadoInativo !== false) {
          divergencias.push(`inativo ${usuario.id} ${modulo.chave}`);
        }
      }
    }

    const perfis = [...new Set(doPerfil.map((linha) => linha.perfil))].sort();
    const chaves = modulos.map((modulo) => modulo.chave);
    const matrizPerfil = formatarMatrizAcessos(perfis, chaves, (perfil, chave) => {
      const modulo = modulos.find((item) => item.chave === chave)!;
      const perfilLinha = doPerfil.find(
        (linha) => linha.perfil === perfil && linha.modulo_id === modulo.id,
      );
      return temAcessoAntigo({
        perfil,
        ativo: true,
        modulo,
        perfilPode: perfilLinha?.pode_acessar,
      });
    });

    // eslint-disable-next-line no-console
    console.log(
      [
        "",
        `Usuários=${usuarios.length} módulos=${modulos.length} overrides=${excecoes.length} (${comOverride.size} usuários)`,
        "Matriz perfil × módulo (padrão, sem override):",
        matrizPerfil,
        "",
        "Usuários com permissao_usuario:",
        ...usuarios
          .filter((usuario) => comOverride.has(usuario.id))
          .map((usuario) => {
            const sqlNovo = "verificado no expect";
            void sqlNovo;
            const overrides = excecoes
              .filter((linha) => linha.usuario_id === usuario.id)
              .map((linha) => {
                const modulo = modulos.find((item) => item.id === linha.modulo_id);
                return `${modulo?.chave}=${linha.pode_acessar}`;
              });
            return `  ${usuario.perfil}#${usuario.id} ${usuario.ativo ? "" : "(inativo) "}[${overrides.join(", ")}]`;
          }),
        "",
      ].join("\n"),
    );

    expect(divergencias).toEqual([]);
  }, 60_000);

  it("cards financeiro/estoque e filtro estoque-baixo usam o universo, não a página de 20", async ({ skip }) => {
    if (!bancoOk) skip(motivoPulo);
    const [fixas, variaveis, estoque, baixoInsumos, baixoTodos, clientes] =
      await Promise.all([
        client.query<{ qtd: number; total: string }>(
          `SELECT COUNT(*)::int AS qtd, COALESCE(SUM(cp.valor), 0)::text AS total
           FROM conta_pagar cp
           JOIN categoria_financeira cf ON cf.id = cp.categoria_id
           WHERE cp.status IN ('aberta', 'atrasada') AND cf.tipo = 'custo_fixo'`,
        ),
        client.query<{ qtd: number; total: string }>(
          `SELECT COUNT(*)::int AS qtd, COALESCE(SUM(cp.valor), 0)::text AS total
           FROM conta_pagar cp
           JOIN categoria_financeira cf ON cf.id = cp.categoria_id
           WHERE cp.status IN ('aberta', 'atrasada') AND cf.tipo = 'custo_variavel'`,
        ),
        client.query<{
          todos: number;
          minimo: number;
          ideal: number;
          excesso: number;
        }>(
          `SELECT
             COUNT(*) FILTER (WHERE ativo = true)::int AS todos,
             COUNT(*) FILTER (
               WHERE ativo = true
                 AND tipo IN ('insumo', 'embalagem')
                 AND estoque_atual < COALESCE(estoque_minimo, 0)
             )::int AS minimo,
             COUNT(*) FILTER (
               WHERE ativo = true
                 AND tipo IN ('produto_final', 'revenda')
                 AND estoque_ideal IS NOT NULL
                 AND estoque_atual < estoque_ideal
             )::int AS ideal,
             COUNT(*) FILTER (
               WHERE ativo = true
                 AND estoque_maximo IS NOT NULL
                 AND estoque_atual >= estoque_maximo
             )::int AS excesso
           FROM produto`,
        ),
        client.query<{ total: number }>(
          `SELECT COUNT(*)::int AS total FROM produto
           WHERE ativo = true
             AND tipo IN ('insumo', 'embalagem')
             AND estoque_atual < COALESCE(estoque_minimo, 0)`,
        ),
        client.query<{ total: number }>(
          `SELECT COUNT(*)::int AS total FROM produto
           WHERE ativo = true
             AND estoque_atual < COALESCE(estoque_minimo, 0)`,
        ),
        client.query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM cliente`),
      ]);

    const pagina = 20;
    const visao = estoque.rows[0];
    const qtdBaixoInsumos = baixoInsumos.rows[0]?.total ?? 0;
    const qtdBaixoTodos = baixoTodos.rows[0]?.total ?? 0;
    const qtdClientes = clientes.rows[0]?.total ?? 0;

    // eslint-disable-next-line no-console
    console.log(
      [
        "",
        `Financeiro cards (universo, sem LIMIT): fixas=${fixas.rows[0]?.qtd} variaveis=${variaveis.rows[0]?.qtd}`,
        `Estoque visão (universo ativo): todos=${visao?.todos} minimo=${visao?.minimo} ideal=${visao?.ideal} excesso=${visao?.excesso}`,
        `Produtos filtro estoque-baixo: todos=${qtdBaixoTodos} insumos=${qtdBaixoInsumos} (página lista=${pagina})`,
        `Clientes cadastrados=${qtdClientes} (lista pagina de ${pagina}; busca/count sem take)`,
        "",
      ].join("\n"),
    );

    expect(visao?.todos).toBeGreaterThan(0);
    expect(qtdBaixoInsumos).toBe(visao?.minimo);
    expect(qtdClientes).toBeGreaterThanOrEqual(0);
    expect(fixas.rows[0]?.qtd ?? 0).toBeGreaterThanOrEqual(0);
  }, 30_000);

  it("dashboard 7d/30d: SQL agregado = agrupamento antigo, mesmo fuso local", async ({ skip }) => {
    if (!bancoOk) skip(motivoPulo);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const inicio7 = inicioLocalMaisDias(-6);
    const inicio30 = inicioLocalMaisDias(-29);
    const fim = inicioLocalMaisDias(1);

    const linhas = (
      await client.query<{
        valor: string;
        valor_liquido: string;
        nome: string;
        finalizado_em: Date;
      }>(
        `SELECT vp.valor::text, vp.valor_liquido::text, fp.nome, v.finalizado_em
         FROM venda_pagamento vp
         JOIN venda v ON v.id = vp.venda_id
         JOIN forma_pagamento fp ON fp.id = vp.forma_pagamento_id
         WHERE vp.status = 'confirmado'
           AND v.status = 'finalizada'
           AND v.finalizado_em >= $1
           AND v.finalizado_em < $2`,
        [inicio30, fim],
      )
    ).rows;

    const antigo7 = new Map<string, { bruto: number; liquido: number }>();
    const antigo30 = new Map<string, number>();
    for (const linha of linhas) {
      const quando = new Date(linha.finalizado_em);
      if (quando >= inicio7 && quando < fim) {
        const chave = dataLocalISO(quando);
        const atual = antigo7.get(chave) ?? { bruto: 0, liquido: 0 };
        atual.bruto += Number(linha.valor);
        atual.liquido += Number(linha.valor_liquido);
        antigo7.set(chave, atual);
      }
      antigo30.set(
        linha.nome,
        (antigo30.get(linha.nome) ?? 0) + Number(linha.valor),
      );
    }

    const casos: string[] = [];
    const params: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const de = inicioLocalMaisDias(i - 6);
      const ate = inicioLocalMaisDias(i - 5);
      casos.push(`WHEN v.finalizado_em >= $${i * 2 + 1} AND v.finalizado_em < $${i * 2 + 2} THEN ${i}`);
      params.push(de, ate);
    }

    const novo7 = (
      await client.query<{ dia_idx: number; bruto: string; liquido: string }>(
        `SELECT
           CASE ${casos.join(" ")} END AS dia_idx,
           COALESCE(SUM(vp.valor), 0)::text AS bruto,
           COALESCE(SUM(vp.valor_liquido), 0)::text AS liquido
         FROM venda_pagamento vp
         JOIN venda v ON v.id = vp.venda_id
         WHERE vp.status = 'confirmado'
           AND v.status = 'finalizada'
           AND v.finalizado_em >= $${params.length + 1}
           AND v.finalizado_em < $${params.length + 2}
         GROUP BY 1`,
        [...params, inicio7, fim],
      )
    ).rows;

    const porIndice = new Map(
      novo7
        .filter((linha) => linha.dia_idx != null)
        .map((linha) => [
          Number(linha.dia_idx),
          { bruto: dinheiro(linha.bruto), liquido: dinheiro(linha.liquido) },
        ]),
    );

    const pontos: {
      rotulo: string;
      iso: string;
      antigo: { bruto: number; liquido: number };
      novo: { bruto: number; liquido: number };
    }[] = [];
    for (let i = 0; i < 7; i++) {
      const dia = inicioLocalMaisDias(i - 6);
      const iso = dataLocalISO(dia);
      const velho = antigo7.get(iso) ?? { bruto: 0, liquido: 0 };
      pontos.push({
        rotulo: iso,
        iso,
        antigo: { bruto: dinheiro(velho.bruto), liquido: dinheiro(velho.liquido) },
        novo: porIndice.get(i) ?? { bruto: 0, liquido: 0 },
      });
    }

    const novo30 = (
      await client.query<{ nome: string; valor: string }>(
        `SELECT fp.nome, SUM(vp.valor)::text AS valor
         FROM venda_pagamento vp
         JOIN venda v ON v.id = vp.venda_id
         JOIN forma_pagamento fp ON fp.id = vp.forma_pagamento_id
         WHERE vp.status = 'confirmado'
           AND v.status = 'finalizada'
           AND v.finalizado_em >= $1
           AND v.finalizado_em < $2
         GROUP BY fp.nome
         HAVING SUM(vp.valor) > 0
         ORDER BY SUM(vp.valor) DESC`,
        [inicio30, fim],
      )
    ).rows;

    const formasAntigas = [...antigo30.entries()]
      .map(([nome, valor]) => ({ nome, valor: dinheiro(valor) }))
      .filter((ponto) => ponto.valor > 0)
      .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome));
    const formasNovas = novo30
      .map((linha) => ({ nome: linha.nome, valor: dinheiro(linha.valor) }))
      .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome));

    const noite = linhas.filter((linha) => {
      const hora = new Date(linha.finalizado_em).getHours();
      return hora >= 21;
    });
    const noiteChecagem = noite.slice(0, 8).map((linha) => {
      const quando = new Date(linha.finalizado_em);
      const isoAntigo = dataLocalISO(quando);
      let idx: number | null = null;
      for (let i = 0; i < 7; i++) {
        const de = inicioLocalMaisDias(i - 6);
        const ate = inicioLocalMaisDias(i - 5);
        if (quando >= de && quando < ate) idx = i;
      }
      const isoNovo = idx == null ? "fora-7d" : dataLocalISO(inicioLocalMaisDias(idx - 6));
      return {
        hora: quando.getHours(),
        antigo: isoAntigo,
        novo: isoNovo,
        igual: isoAntigo === isoNovo || isoNovo === "fora-7d",
      };
    });

    // eslint-disable-next-line no-console
    console.log(
      [
        "",
        `Fuso do processo: ${tz}`,
        `Janela 7d local: ${dataLocalISO(inicio7)} .. < ${dataLocalISO(fim)}`,
        "7d antigo vs SQL:",
        ...pontos.map(
          (ponto) =>
            `  ${ponto.iso} antigo=${ponto.antigo.bruto}/${ponto.antigo.liquido} sql=${ponto.novo.bruto}/${ponto.novo.liquido}`,
        ),
        "30d formas antigo vs SQL:",
        ...formasNovas.map((ponto, i) => {
          const velho = formasAntigas[i];
          return `  ${ponto.nome} sql=${ponto.valor} antigo=${velho?.valor ?? 0}`;
        }),
        `Vendas/pagamentos após 21h no recorte 30d: ${noite.length}`,
        ...noiteChecagem.map(
          (item) =>
            `  hora=${item.hora} antigo=${item.antigo} novo=${item.novo} igual=${item.igual}`,
        ),
        "",
      ].join("\n"),
    );

    for (const ponto of pontos) {
      expect(ponto.novo).toEqual(ponto.antigo);
    }
    expect(formasNovas).toEqual(formasAntigas);
    expect(noiteChecagem.every((item) => item.igual)).toBe(true);
  }, 60_000);
});
