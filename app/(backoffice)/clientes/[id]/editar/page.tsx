import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirAcesso } from "@/lib/permissoes";
import { atualizarCliente } from "../../actions";
import { ClienteForm } from "../../cliente-form";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarClientePage({ params }: Props) {
  await exigirAcesso("clientes");
  const { id } = await params;
  const clienteId = Number(id);
  if (!Number.isInteger(clienteId)) notFound();

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
  });
  if (!cliente) notFound();

  const atualizar = atualizarCliente.bind(null, cliente.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/clientes" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para clientes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Editar cliente
        </h1>
      </div>
      <ClienteForm
        action={atualizar}
        submitLabel="Salvar"
        cliente={{
          nome: cliente.nome,
          cpf: cliente.cpf,
          telefone: cliente.telefone,
          email: cliente.email,
          endereco: cliente.endereco,
          data_nascimento: cliente.data_nascimento,
        }}
      />
    </div>
  );
}
