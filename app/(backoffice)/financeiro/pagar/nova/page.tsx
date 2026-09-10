import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirAcesso } from "@/lib/permissoes";
import { PagarForm } from "../../pagar-form";

export const dynamic = "force-dynamic";

export default async function NovaContaPagarPage() {
  await exigirAcesso("financeiro");
  const [categorias, fornecedores] = await Promise.all([
    prisma.categoria_financeira.findMany({
      where: { tipo: { in: ["custo_fixo", "custo_variavel"] } },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, tipo: true },
    }),
    prisma.fornecedor.findMany({
      where: { ativo: true },
      orderBy: { razao_social: "asc" },
      select: { id: true, razao_social: true, nome_fantasia: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/financeiro?aba=despesas"
          className="text-sm text-zinc-600 hover:underline"
        >
          ← Voltar para financeiro
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nova conta a pagar
        </h1>
      </div>
      <PagarForm categorias={categorias} fornecedores={fornecedores} />
    </div>
  );
}
