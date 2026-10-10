import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  formatarMatrizAcessos,
  mapaAcessosAntigo,
  montarMapaAcessos,
  temAcessoAntigo,
  type LinhaAcesso,
  type ModuloAcesso,
} from "@/lib/mapa-acessos";

/**
 * Catálogo e padrão de permissao_perfil conforme as migrations
 * 009, 008, 010, 015, 022, 024, 027, 028, 030 e 031.
 * saude é o único somente_super_admin.
 */
const MODULOS: ModuloAcesso[] = [
  { id: 1, chave: "dashboard", somente_super_admin: false },
  { id: 2, chave: "produtos", somente_super_admin: false },
  { id: 3, chave: "clientes", somente_super_admin: false },
  { id: 4, chave: "fornecedores", somente_super_admin: false },
  { id: 5, chave: "usuarios", somente_super_admin: false },
  { id: 6, chave: "funcionarios", somente_super_admin: false },
  { id: 7, chave: "estoque", somente_super_admin: false },
  { id: 8, chave: "compras", somente_super_admin: false },
  { id: 9, chave: "pdv", somente_super_admin: false },
  { id: 10, chave: "caixa", somente_super_admin: false },
  { id: 11, chave: "vendas", somente_super_admin: false },
  { id: 12, chave: "financeiro", somente_super_admin: false },
  { id: 13, chave: "saude", somente_super_admin: true },
  { id: 14, chave: "empresa", somente_super_admin: false },
  { id: 15, chave: "etiquetas", somente_super_admin: false },
  { id: 16, chave: "pedidos", somente_super_admin: false },
  { id: 17, chave: "relatorios", somente_super_admin: false },
  { id: 18, chave: "auditoria", somente_super_admin: false },
  { id: 19, chave: "cancelar_venda", somente_super_admin: false },
  { id: 20, chave: "producao", somente_super_admin: false },
  { id: 21, chave: "cancelar_producao", somente_super_admin: false },
  { id: 22, chave: "cancelar_pedido", somente_super_admin: false },
];

const PERFIS = [
  "super_admin",
  "proprietario",
  "gerente",
  "financeiro",
  "estoquista",
  "operador_pdv",
] as const;

const LIBERADO: Record<(typeof PERFIS)[number], readonly string[]> = {
  super_admin: MODULOS.map((modulo) => modulo.chave),
  proprietario: MODULOS.filter((modulo) => !modulo.somente_super_admin).map(
    (modulo) => modulo.chave,
  ),
  gerente: [
    "dashboard",
    "produtos",
    "clientes",
    "fornecedores",
    "usuarios",
    "funcionarios",
    "estoque",
    "compras",
    "pdv",
    "caixa",
    "vendas",
    "financeiro",
    "empresa",
    "etiquetas",
    "pedidos",
    "relatorios",
    "auditoria",
    "cancelar_venda",
    "producao",
    "cancelar_producao",
    "cancelar_pedido",
  ],
  financeiro: [
    "dashboard",
    "caixa",
    "vendas",
    "financeiro",
    "clientes",
    "fornecedores",
    "pedidos",
    "relatorios",
  ],
  estoquista: [
    "dashboard",
    "produtos",
    "estoque",
    "compras",
    "etiquetas",
    "relatorios",
    "producao",
  ],
  operador_pdv: ["dashboard", "pdv", "caixa", "vendas", "pedidos"],
};

function perfilPode(perfil: (typeof PERFIS)[number], chave: string) {
  return LIBERADO[perfil].includes(chave);
}

function doPerfil(perfil: (typeof PERFIS)[number]) {
  return MODULOS.map((modulo) => ({
    modulo_id: modulo.id,
    pode_acessar: perfilPode(perfil, modulo.chave),
  }));
}

function linhasJoin(
  perfil: string,
  excecoes: { modulo_id: number; pode_acessar: boolean }[],
): LinhaAcesso[] {
  const porExcecao = new Map(excecoes.map((linha) => [linha.modulo_id, linha]));
  return MODULOS.map((modulo) => ({
    chave: modulo.chave,
    somente_super_admin: modulo.somente_super_admin,
    perfil_pode: perfilPode(perfil as (typeof PERFIS)[number], modulo.chave)
      ? true
      : false,
    excecao: porExcecao.has(modulo.id)
      ? porExcecao.get(modulo.id)!.pode_acessar
      : null,
  }));
}

function mapaNovo(
  perfil: string,
  excecoes: { modulo_id: number; pode_acessar: boolean }[] = [],
) {
  return montarMapaAcessos(perfil, linhasJoin(perfil, excecoes));
}

function mapaVelho(
  perfil: string,
  excecoes: { modulo_id: number; pode_acessar: boolean }[] = [],
  ativo = true,
) {
  return mapaAcessosAntigo({
    perfil,
    ativo,
    modulos: MODULOS,
    excecoes,
    doPerfil: doPerfil(perfil as (typeof PERFIS)[number]),
  });
}

describe("equivalência novo mapa (JOIN) vs git e3cfb41", () => {
  it("matriz perfil × módulo idêntica, inclusive saude só super_admin", () => {
    const chaves = MODULOS.map((modulo) => modulo.chave);
    const divergencias: string[] = [];

    for (const perfil of PERFIS) {
      const novo = mapaNovo(perfil);
      const antigo = mapaVelho(perfil);
      expect(novo, perfil).toEqual(antigo);

      for (const modulo of MODULOS) {
        const porModulo = temAcessoAntigo({
          perfil,
          ativo: true,
          modulo,
          perfilPode: perfilPode(perfil, modulo.chave),
        });
        if (novo[modulo.chave] !== porModulo) {
          divergencias.push(`${perfil}/${modulo.chave}`);
        }
      }
    }

    const matriz = formatarMatrizAcessos(
      PERFIS.slice(),
      chaves,
      (perfil, chave) => mapaNovo(perfil)[chave],
    );
    // eslint-disable-next-line no-console
    console.log("\nMatriz perfil × módulo (1=acesso, padrão das migrations)\n" + matriz + "\n");

    expect(divergencias).toEqual([]);
    expect(mapaNovo("super_admin").saude).toBe(true);
    expect(mapaNovo("proprietario").saude).toBe(false);
    expect(mapaNovo("gerente").saude).toBe(false);
    expect(mapaNovo("proprietario").auditoria).toBe(true);
    expect(mapaNovo("proprietario").cancelar_pedido).toBe(true);
  });

  it("override permissao_usuario vence o perfil e não vence somente_super_admin", () => {
    const pdv = MODULOS.find((modulo) => modulo.chave === "pdv")!;
    const financeiro = MODULOS.find((modulo) => modulo.chave === "financeiro")!;
    const saude = MODULOS.find((modulo) => modulo.chave === "saude")!;

    const negarPdv = [{ modulo_id: pdv.id, pode_acessar: false }];
    const liberarFin = [{ modulo_id: financeiro.id, pode_acessar: true }];
    const negarSaude = [{ modulo_id: saude.id, pode_acessar: false }];
    const liberarSaude = [{ modulo_id: saude.id, pode_acessar: true }];

    expect(mapaNovo("gerente", negarPdv)).toEqual(mapaVelho("gerente", negarPdv));
    expect(mapaNovo("gerente", negarPdv).pdv).toBe(false);

    expect(mapaNovo("operador_pdv", liberarFin)).toEqual(
      mapaVelho("operador_pdv", liberarFin),
    );
    expect(mapaNovo("operador_pdv", liberarFin).financeiro).toBe(true);

    expect(mapaNovo("super_admin", negarSaude).saude).toBe(true);
    expect(mapaNovo("gerente", liberarSaude).saude).toBe(false);
    expect(mapaNovo("super_admin", negarSaude)).toEqual(
      mapaVelho("super_admin", negarSaude),
    );
    expect(mapaNovo("gerente", liberarSaude)).toEqual(
      mapaVelho("gerente", liberarSaude),
    );
    expect(
      temAcessoAntigo({
        perfil: "super_admin",
        ativo: true,
        modulo: saude,
        excecao: false,
        perfilPode: true,
      }),
    ).toBe(true);
  });

  it("contexto-acesso usa o mesmo JOIN do SQL de prova", () => {
    const src = readFileSync("lib/contexto-acesso.ts", "utf8");
    expect(src).toContain("LEFT JOIN permissao_perfil pp");
    expect(src).toContain("ON pp.modulo_id = m.id AND pp.perfil = u.perfil");
    expect(src).toContain("LEFT JOIN permissao_usuario pu");
    expect(src).toContain("ON pu.modulo_id = m.id AND pu.usuario_id = u.id");
    expect(src).toContain("montarMapaAcessos(usuario.perfil, linhas)");
  });
});
