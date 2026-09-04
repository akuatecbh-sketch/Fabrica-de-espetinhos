import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  podeConfigurarPermissoesIndividuais,
  podeGerenciarUsuario,
  perfisQuePodeAtribuir,
} from "@/lib/acesso";
import { exigirAcesso } from "@/lib/permissoes";
import { superAdminOcultoPara } from "@/lib/visibilidade";
import { atualizarUsuario } from "../../actions";
import { UsuarioForm } from "../../usuario-form";
import { PermissoesIndividuais } from "../../permissoes-individuais";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarUsuarioPage({ params }: Props) {
  const logado = await exigirAcesso("usuarios");
  const { id } = await params;
  const usuarioId = Number(id);
  if (!Number.isInteger(usuarioId)) notFound();

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
  });
  if (!usuario) notFound();
  if (superAdminOcultoPara(logado.perfil, usuario.perfil)) notFound();

  if (!podeGerenciarUsuario(logado.perfil, usuario.perfil)) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/usuarios" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para usuários
        </Link>
        <p className="rounded border border-vermelho-erro/40 bg-vermelho-erro/10 px-3 py-2 text-sm text-vermelho-erro">
          Acesso não permitido
        </p>
      </div>
    );
  }

  const atualizar = atualizarUsuario.bind(null, usuario.id);
  const verExcecoes = podeConfigurarPermissoesIndividuais(
    logado.perfil,
    usuario.perfil,
  );

  const linhasPermissao = verExcecoes
    ? await montarLinhasPermissao(logado.perfil, usuario.perfil, usuario.id)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/usuarios" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para usuários
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Editar usuário
        </h1>
      </div>
      <UsuarioForm
        action={atualizar}
        perfis={perfisQuePodeAtribuir(logado.perfil)}
        submitLabel="Salvar"
        usuario={{
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
        }}
      />
      {verExcecoes ? (
        <PermissoesIndividuais usuarioId={usuario.id} linhas={linhasPermissao} />
      ) : null}
    </div>
  );
}

async function montarLinhasPermissao(
  perfilLogado: string,
  perfilAlvo: string,
  usuarioId: number,
) {
  const incluirSomenteSuper = perfilLogado === "super_admin";
  const modulos = await prisma.modulo.findMany({
    where: incluirSomenteSuper ? undefined : { somente_super_admin: false },
    orderBy: { ordem: "asc" },
    select: { id: true, nome: true },
  });
  const [doPerfil, excecoes] = await Promise.all([
    prisma.permissao_perfil.findMany({
      where: { perfil: perfilAlvo },
      select: { modulo_id: true, pode_acessar: true },
    }),
    prisma.permissao_usuario.findMany({
      where: { usuario_id: usuarioId },
      select: { modulo_id: true, pode_acessar: true },
    }),
  ]);
  const padrao = new Map(doPerfil.map((linha) => [linha.modulo_id, linha.pode_acessar]));
  const porUsuario = new Map(
    excecoes.map((linha) => [linha.modulo_id, linha.pode_acessar]),
  );

  return modulos.map((modulo) => ({
    moduloId: modulo.id,
    nome: modulo.nome,
    padraoPerfil: padrao.get(modulo.id) ?? false,
    excecao: porUsuario.has(modulo.id) ? Boolean(porUsuario.get(modulo.id)) : null,
  }));
}
