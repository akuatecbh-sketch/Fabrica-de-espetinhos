import { redirect } from "next/navigation";
import { carregarContextoAcesso } from "@/lib/contexto-acesso";
import { prisma } from "@/lib/prisma";
import type { MapaAcessos } from "@/lib/permissoes-rotas";
import { resolverAcesso } from "@/lib/resolver-acesso";
import { obterUsuarioSessao } from "@/lib/usuario-sessao";

export type { MapaAcessos } from "@/lib/permissoes-rotas";
export { CHAVE_POR_HREF, moduloChaveDaRota } from "@/lib/permissoes-rotas";

async function mapaAcessosAvulso(usuarioId: number): Promise<MapaAcessos> {
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

export async function temAcesso(
  usuarioId: number,
  moduloChave: string,
): Promise<boolean> {
  const contexto = await carregarContextoAcesso();
  if (contexto.estado === "ok" && contexto.usuario.id === usuarioId) {
    return Boolean(contexto.acessos[moduloChave]);
  }
  if (contexto.estado === "ok") {
    const mapa = await mapaAcessosAvulso(usuarioId);
    return Boolean(mapa[moduloChave]);
  }
  return false;
}

export async function temAcessoMultiplo(usuarioId: number): Promise<MapaAcessos> {
  const contexto = await carregarContextoAcesso();
  if (contexto.estado === "ok" && contexto.usuario.id === usuarioId) {
    return contexto.acessos;
  }
  if (contexto.estado === "ok") {
    return mapaAcessosAvulso(usuarioId);
  }
  return {};
}

export async function exigirAcesso(moduloChave: string) {
  const usuario = await obterUsuarioSessao();
  if (!(await temAcesso(usuario.id, moduloChave))) {
    redirect("/acesso-negado");
  }
  return usuario;
}
