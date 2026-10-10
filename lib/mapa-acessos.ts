import type { MapaAcessos } from "@/lib/permissoes-rotas";
import { resolverAcesso } from "@/lib/resolver-acesso";

export type LinhaAcesso = {
  chave: string;
  somente_super_admin: boolean;
  perfil_pode: boolean | null;
  excecao: boolean | null;
};

export type ModuloAcesso = {
  id: number;
  chave: string;
  somente_super_admin: boolean;
};

export const SQL_LINHAS_ACESSO = `
        SELECT
          m.chave,
          m.somente_super_admin,
          pp.pode_acessar AS perfil_pode,
          pu.pode_acessar AS excecao
        FROM modulo m
        LEFT JOIN usuario u ON u.id = $1
        LEFT JOIN permissao_perfil pp
          ON pp.modulo_id = m.id AND pp.perfil = u.perfil
        LEFT JOIN permissao_usuario pu
          ON pu.modulo_id = m.id AND pu.usuario_id = u.id
      `;

export function boolOuUndefined(valor: boolean | null): boolean | undefined {
  return valor === null ? undefined : valor;
}

export function montarMapaAcessos(
  perfil: string,
  linhas: LinhaAcesso[],
): MapaAcessos {
  const acessos: MapaAcessos = {};
  for (const linha of linhas) {
    acessos[linha.chave] = resolverAcesso({
      perfil,
      somenteSuperAdmin: linha.somente_super_admin,
      excecao: boolOuUndefined(linha.excecao),
      perfilPode: boolOuUndefined(linha.perfil_pode),
    });
  }
  return acessos;
}

/** Implementação de temAcessoMultiplo em e3cfb41 (antes do cache por requisição). */
export function mapaAcessosAntigo(params: {
  perfil: string;
  ativo: boolean;
  modulos: ModuloAcesso[];
  excecoes: { modulo_id: number; pode_acessar: boolean }[];
  doPerfil: { modulo_id: number; pode_acessar: boolean }[];
}): MapaAcessos {
  const vazio: MapaAcessos = Object.fromEntries(
    params.modulos.map((modulo) => [modulo.chave, false]),
  );
  if (!params.ativo) return vazio;

  const porExcecao = new Map(
    params.excecoes.map((linha) => [linha.modulo_id, linha.pode_acessar]),
  );
  const porPerfil = new Map(
    params.doPerfil.map((linha) => [linha.modulo_id, linha.pode_acessar]),
  );

  const mapa: MapaAcessos = {};
  for (const modulo of params.modulos) {
    mapa[modulo.chave] = resolverAcesso({
      perfil: params.perfil,
      somenteSuperAdmin: modulo.somente_super_admin,
      excecao: porExcecao.get(modulo.id),
      perfilPode: porPerfil.get(modulo.id),
    });
  }
  return mapa;
}

/** Implementação de temAcesso (um módulo) em e3cfb41. */
export function temAcessoAntigo(params: {
  perfil: string;
  ativo: boolean;
  modulo?: { somente_super_admin: boolean } | null;
  excecao?: boolean;
  perfilPode?: boolean;
}): boolean {
  if (!params.ativo || !params.modulo) return false;
  if (params.modulo.somente_super_admin) {
    return params.perfil === "super_admin";
  }
  if (params.excecao !== undefined) return params.excecao;
  return params.perfilPode ?? false;
}

export function formatarMatrizAcessos(
  perfis: string[],
  chaves: string[],
  celula: (perfil: string, chave: string) => boolean,
) {
  const cabecalho = ["perfil", ...chaves].join("\t");
  const linhas = perfis.map((perfil) =>
    [
      perfil,
      ...chaves.map((chave) => (celula(perfil, chave) ? "1" : "0")),
    ].join("\t"),
  );
  return [cabecalho, ...linhas].join("\n");
}
