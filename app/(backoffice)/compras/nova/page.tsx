import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirCompras } from "@/lib/sessao";
import { CompraForm } from "../compra-form";

export const dynamic = "force-dynamic";

export default async function NovaCompraPage() {
  await exigirCompras();

  const fornecedores = await prisma.fornecedor.findMany({
    where: { ativo: true },
    orderBy: { razao_social: "asc" },
    select: { id: true, razao_social: true, nome_fantasia: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/compras" className="text-sm text-zinc-600 hover:underline">
          ← Voltar para compras
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nova nota de entrada
        </h1>
      </div>
      <CompraForm fornecedores={fornecedores} />
    </div>
  );
}
