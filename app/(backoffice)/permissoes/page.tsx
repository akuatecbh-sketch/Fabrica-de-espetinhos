import { prisma } from "@/lib/prisma";
import { PERFIS_GRADE_PERMISSOES } from "@/lib/acesso";
import { exigirSuperAdmin } from "@/lib/sessao";
import { GradePermissoes } from "./grade";

export const dynamic = "force-dynamic";

export default async function PermissoesPage() {
  await exigirSuperAdmin();

  const modulos = await prisma.modulo.findMany({
    where: { somente_super_admin: false },
    orderBy: { ordem: "asc" },
    select: { id: true, nome: true },
  });

  const linhas = await prisma.permissao_perfil.findMany({
    where: {
      perfil: { in: [...PERFIS_GRADE_PERMISSOES] },
      modulo_id: { in: modulos.map((modulo) => modulo.id) },
    },
    select: { perfil: true, modulo_id: true, pode_acessar: true },
  });

  const matriz: Record<string, Record<number, boolean>> = {};
  for (const perfil of PERFIS_GRADE_PERMISSOES) {
    matriz[perfil] = {};
    for (const modulo of modulos) {
      matriz[perfil][modulo.id] = false;
    }
  }
  for (const linha of linhas) {
    if (!matriz[linha.perfil]) continue;
    matriz[linha.perfil][linha.modulo_id] = linha.pode_acessar;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Permissões</h1>
        <p className="mt-2 max-w-3xl text-sm text-texto-secundario">
          Esta tela define o <strong>padrão por perfil</strong>: o acesso
          inicial de todo usuário daquele perfil. Exceções individuais
          (liberar ou bloquear um módulo só para uma pessoa) são
          configuradas na tela de edição de cada usuário.
        </p>
      </div>
      <GradePermissoes
        modulos={modulos}
        perfis={PERFIS_GRADE_PERMISSOES}
        matriz={matriz}
      />
    </div>
  );
}
