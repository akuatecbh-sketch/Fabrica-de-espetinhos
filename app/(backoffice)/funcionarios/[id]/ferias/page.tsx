import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dataUtcMeiaNoite, dataLocalISO } from "@/lib/financeiro";
import { exigirAcesso } from "@/lib/permissoes";
import { ListaFerias } from "./lista-ferias";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function FeriasFuncionarioPage({ params }: Props) {
  await exigirAcesso("funcionarios");
  const { id } = await params;
  const funcionarioId = Number(id);
  if (!Number.isInteger(funcionarioId)) notFound();

  const funcionario = await prisma.funcionario.findUnique({
    where: { id: funcionarioId },
    include: {
      ferias: { orderBy: { periodo_aquisitivo_inicio: "desc" } },
    },
  });
  if (!funcionario) notFound();

  const hoje = dataUtcMeiaNoite(dataLocalISO());

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
          Férias de {funcionario.nome}
        </h1>
        <p className="mt-1 text-sm text-texto-secundario">
          {funcionario.cargo}
          {funcionario.ativo ? "" : " · Desligado"}
        </p>
      </div>

      <ListaFerias
        funcionarioId={funcionario.id}
        periodos={funcionario.ferias}
        hoje={hoje}
      />
    </div>
  );
}
