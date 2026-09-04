import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirGerenteOuSuperAdmin } from "@/lib/sessao";
import { atualizarFaq } from "../../actions";
import { FaqForm } from "../../faq-form";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarFaqPage({ params }: Props) {
  await exigirGerenteOuSuperAdmin();
  const { id } = await params;
  const faqId = Number(id);
  if (!Number.isInteger(faqId)) notFound();

  const [item, modulos] = await Promise.all([
    prisma.faq_item.findUnique({ where: { id: faqId } }),
    prisma.modulo.findMany({
      orderBy: { ordem: "asc" },
      select: { chave: true, nome: true },
    }),
  ]);
  if (!item) notFound();

  const atualizar = atualizarFaq.bind(null, item.id);

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
          Editar pergunta
        </h1>
      </div>
      <FaqForm
        action={atualizar}
        modulos={modulos}
        submitLabel="Salvar"
        item={{
          titulo: item.titulo,
          palavras_chave: item.palavras_chave,
          resposta: item.resposta,
          rota_destino: item.rota_destino,
          modulo_chave: item.modulo_chave,
          ordem: item.ordem,
          ativo: item.ativo,
        }}
      />
    </div>
  );
}
