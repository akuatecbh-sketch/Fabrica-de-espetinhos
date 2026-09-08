import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirAcesso } from "@/lib/permissoes";
import { nomeExibicaoCliente } from "@/lib/cliente";
import { ReceberForm } from "../../receber-form";

export const dynamic = "force-dynamic";

export default async function NovaContaReceberPage() {
  await exigirAcesso("financeiro");
  const clientes = (
    await prisma.cliente.findMany({
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        tipo_pessoa: true,
        razao_social: true,
        nome_fantasia: true,
      },
    })
  ).map((cliente) => ({
    id: cliente.id,
    nome: nomeExibicaoCliente(cliente),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/financeiro?aba=receber"
          className="text-sm text-zinc-600 hover:underline"
        >
          ← Voltar para financeiro
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nova conta a receber
        </h1>
      </div>
      <ReceberForm clientes={clientes} />
    </div>
  );
}
