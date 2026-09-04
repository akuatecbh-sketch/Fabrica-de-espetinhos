import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirGerenteOuSuperAdmin } from "@/lib/sessao";
import { criarFaq } from "../actions";
import { FaqForm } from "../faq-form";

export const dynamic = "force-dynamic";

export default async function NovaFaqPage() {
  await exigirGerenteOuSuperAdmin();
  const modulos = await prisma.modulo.findMany({
    orderBy: { ordem: "asc" },
    select: { chave: true, nome: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/ajuda/gerenciar"
          className="text-sm text-zinc-600 hover:underline"
        >
          ← Voltar para perguntas
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nova pergunta
        </h1>
      </div>
      <FaqForm action={criarFaq} modulos={modulos} submitLabel="Cadastrar" />
    </div>
  );
}
