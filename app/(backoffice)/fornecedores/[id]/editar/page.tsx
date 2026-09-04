import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirAcesso } from "@/lib/permissoes";
import { atualizarFornecedor } from "../../actions";
import { FornecedorForm } from "../../fornecedor-form";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarFornecedorPage({ params }: Props) {
  await exigirAcesso("fornecedores");
  const { id } = await params;
  const fornecedorId = Number(id);
  if (!Number.isInteger(fornecedorId)) notFound();

  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id: fornecedorId },
  });
  if (!fornecedor) notFound();

  const atualizar = atualizarFornecedor.bind(null, fornecedor.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/fornecedores"
          className="text-sm text-zinc-600 hover:underline"
        >
          ← Voltar para fornecedores
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Editar fornecedor
        </h1>
      </div>
      <FornecedorForm
        action={atualizar}
        submitLabel="Salvar"
        fornecedor={{
          razao_social: fornecedor.razao_social,
          nome_fantasia: fornecedor.nome_fantasia,
          cnpj_cpf: fornecedor.cnpj_cpf,
          inscricao_estadual: fornecedor.inscricao_estadual,
          telefone: fornecedor.telefone,
          email: fornecedor.email,
          endereco: fornecedor.endereco,
          contato_nome: fornecedor.contato_nome,
          ativo: fornecedor.ativo,
        }}
      />
    </div>
  );
}
