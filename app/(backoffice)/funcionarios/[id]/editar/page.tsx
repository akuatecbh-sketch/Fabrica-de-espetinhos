import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirRh } from "@/lib/sessao";
import { atualizarFuncionario, listarUsuariosDisponiveis } from "../../actions";
import { FuncionarioForm } from "../../funcionario-form";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarFuncionarioPage({ params }: Props) {
  const logado = await exigirRh();
  const { id } = await params;
  const funcionarioId = Number(id);
  if (!Number.isInteger(funcionarioId)) notFound();

  const [funcionario, usuarios] = await Promise.all([
    prisma.funcionario.findUnique({ where: { id: funcionarioId } }),
    listarUsuariosDisponiveis(funcionarioId),
  ]);
  if (!funcionario) notFound();

  const atualizar = atualizarFuncionario.bind(null, funcionario.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/funcionarios"
          className="text-sm text-zinc-600 hover:underline"
        >
          ← Voltar para funcionários
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Editar funcionário
        </h1>
      </div>
      <FuncionarioForm
        action={atualizar}
        submitLabel="Salvar"
        usuarios={usuarios}
        perfilDeQuemVeVe={logado.perfil}
        funcionario={{
          nome: funcionario.nome,
          cpf: funcionario.cpf,
          rg: funcionario.rg,
          data_nascimento: funcionario.data_nascimento,
          telefone: funcionario.telefone,
          email: funcionario.email,
          endereco: funcionario.endereco,
          cargo: funcionario.cargo,
          salario: funcionario.salario,
          data_admissao: funcionario.data_admissao,
          usuario_id: usuarios.some((item) => item.id === funcionario.usuario_id)
            ? funcionario.usuario_id
            : null,
        }}
      />
    </div>
  );
}
