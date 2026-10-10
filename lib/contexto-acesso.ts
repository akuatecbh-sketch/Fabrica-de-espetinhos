import { cache } from "react";
import { auth } from "@/auth";
import { montarMapaAcessos, type LinhaAcesso } from "@/lib/mapa-acessos";
import type { MapaAcessos } from "@/lib/permissoes-rotas";
import { prisma } from "@/lib/prisma";
import type { UsuarioSessao } from "@/lib/usuario-tipos";

export type ContextoAcessoOk = {
  estado: "ok";
  usuario: UsuarioSessao;
  acessos: MapaAcessos;
  caixa: Awaited<ReturnType<typeof buscarCaixaAberto>>;
};

export type ContextoAcesso =
  | { estado: "sem_sessao" }
  | { estado: "invalido" }
  | ContextoAcessoOk;

function buscarCaixaAberto() {
  return prisma.caixa.findFirst({
    where: { status: "aberto" },
    orderBy: { data_abertura: "desc" },
  });
}

export const carregarContextoAcesso = cache(
  async (): Promise<ContextoAcesso> => {
    const sessao = await auth();
    const id = sessao?.usuario?.id;
    if (!id) return { estado: "sem_sessao" };

    const [usuario, caixa, linhas] = await Promise.all([
      prisma.usuario.findUnique({
        where: { id },
        select: {
          id: true,
          nome: true,
          perfil: true,
          senha_provisoria: true,
          ativo: true,
        },
      }),
      buscarCaixaAberto(),
      prisma.$queryRaw<LinhaAcesso[]>`
        SELECT
          m.chave,
          m.somente_super_admin,
          pp.pode_acessar AS perfil_pode,
          pu.pode_acessar AS excecao
        FROM modulo m
        LEFT JOIN usuario u ON u.id = ${id}
        LEFT JOIN permissao_perfil pp
          ON pp.modulo_id = m.id AND pp.perfil = u.perfil
        LEFT JOIN permissao_usuario pu
          ON pu.modulo_id = m.id AND pu.usuario_id = u.id
      `,
    ]);

    if (!usuario || !usuario.ativo) return { estado: "invalido" };

    return {
      estado: "ok",
      usuario,
      acessos: montarMapaAcessos(usuario.perfil, linhas),
      caixa,
    };
  },
);
