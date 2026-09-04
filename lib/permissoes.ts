import { prisma } from "@/lib/prisma";
import type { MapaAcessos } from "@/lib/permissoes-rotas";

export type { MapaAcessos } from "@/lib/permissoes-rotas";
export { CHAVE_POR_HREF, moduloChaveDaRota } from "@/lib/permissoes-rotas";

function resolverAcesso(params: {
  perfil: string;
  somenteSuperAdmin: boolean;
  excecao: boolean | undefined;
  perfilPode: boolean | undefined;
}) {
  if (params.somenteSuperAdmin) {
    return params.perfil === "super_admin";
  }
  if (params.excecao !== undefined) return params.excecao;
  return params.perfilPode ?? false;
}

export async function temAcesso(
  usuarioId: number,
  moduloChave: string,
): Promise<boolean> {
  const [usuario, modulo] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { perfil: true, ativo: true },
    }),
    prisma.modulo.findUnique({
      where: { chave: moduloChave },
      select: { id: true, somente_super_admin: true },
    }),
  ]);

  if (!usuario?.ativo || !modulo) return false;

  if (modulo.somente_super_admin) {
    return usuario.perfil === "super_admin";
  }

  const excecao = await prisma.permissao_usuario.findFirst({
    where: { usuario_id: usuarioId, modulo_id: modulo.id },
    select: { pode_acessar: true },
  });
  if (excecao) return excecao.pode_acessar;

  const doPerfil = await prisma.permissao_perfil.findFirst({
    where: { perfil: usuario.perfil, modulo_id: modulo.id },
    select: { pode_acessar: true },
  });
  return doPerfil?.pode_acessar ?? false;
}

export async function temAcessoMultiplo(usuarioId: number): Promise<MapaAcessos> {
  const [usuario, modulos] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { perfil: true, ativo: true },
    }),
    prisma.modulo.findMany({
      select: { id: true, chave: true, somente_super_admin: true },
    }),
  ]);

  const vazio: MapaAcessos = Object.fromEntries(
    modulos.map((modulo) => [modulo.chave, false]),
  );
  if (!usuario?.ativo) return vazio;

  const [excecoes, doPerfil] = await Promise.all([
    prisma.permissao_usuario.findMany({
      where: { usuario_id: usuarioId },
      select: { modulo_id: true, pode_acessar: true },
    }),
    prisma.permissao_perfil.findMany({
      where: { perfil: usuario.perfil },
      select: { modulo_id: true, pode_acessar: true },
    }),
  ]);

  const porExcecao = new Map(
    excecoes.map((linha) => [linha.modulo_id, linha.pode_acessar]),
  );
  const porPerfil = new Map(
    doPerfil.map((linha) => [linha.modulo_id, linha.pode_acessar]),
  );

  const mapa: MapaAcessos = {};
  for (const modulo of modulos) {
    mapa[modulo.chave] = resolverAcesso({
      perfil: usuario.perfil,
      somenteSuperAdmin: modulo.somente_super_admin,
      excecao: porExcecao.get(modulo.id),
      perfilPode: porPerfil.get(modulo.id),
    });
  }
  return mapa;
}
