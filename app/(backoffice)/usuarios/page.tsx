import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { podeGerenciarUsuario } from "@/lib/acesso";
import { exigirAcesso } from "@/lib/permissoes";
import {
  SELECT_USUARIO_RELACAO,
  filtroOcultarSuperAdmin,
  nomeExibicao,
} from "@/lib/visibilidade";
import { ListaUsuarios } from "./lista-usuarios";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function UsuariosPage({ searchParams }: Props) {
  const logado = await exigirAcesso("usuarios");
  const { q: buscaBruta } = await searchParams;
  const busca = (buscaBruta ?? "").trim();

  const registros = await prisma.usuario.findMany({
    where: {
      ...filtroOcultarSuperAdmin(logado.perfil),
      ...(busca
        ? {
            OR: [
              { nome: { contains: busca, mode: "insensitive" } },
              { email: { contains: busca, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      ativo: true,
      senha_provisoria: true,
      ultimo_login: true,
      criado_por: { select: SELECT_USUARIO_RELACAO },
    },
  });

  const usuarios = registros.map((usuario) => {
    const { criado_por, ...resto } = usuario;
    return {
      ...resto,
      criadoPor: nomeExibicao(criado_por, logado.perfil).nome,
      podeGerenciar: podeGerenciarUsuario(logado.perfil, usuario.perfil),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <Link
          href="/usuarios/novo"
          className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
        >
          Novo usuário
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 w-full flex-1 flex-col gap-1 text-sm sm:min-w-64">
          Buscar por nome ou e-mail
          <input
            name="q"
            defaultValue={busca}
            placeholder="Nome ou e-mail"
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Buscar
        </button>
      </form>

      <ListaUsuarios
        usuarios={usuarios}
        vazio={
          busca
            ? "Nenhum usuário encontrado para essa busca."
            : "Nenhum usuário cadastrado."
        }
      />
    </div>
  );
}
