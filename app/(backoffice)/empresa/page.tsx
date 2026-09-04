import { LOGO_PUBLICA, existeLogoBlob } from "@/lib/empresa-logo";
import { prisma } from "@/lib/prisma";
import { exigirAcesso } from "@/lib/permissoes";
import { EmpresaForm } from "./empresa-form";

export const dynamic = "force-dynamic";

export default async function EmpresaPage() {
  await exigirAcesso("empresa");
  const [empresa, temLogo] = await Promise.all([
    prisma.empresa.findUnique({
      where: { id: 1 },
    }),
    existeLogoBlob(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Empresa</h1>
        <p className="mt-1 text-sm text-texto-secundario">
          Razão social, CNPJ e logomarca usados na identificação do negócio.
        </p>
      </div>
      <EmpresaForm
        empresa={
          empresa
            ? {
                razao_social: empresa.razao_social,
                nome_fantasia: empresa.nome_fantasia,
                cnpj: empresa.cnpj,
                endereco: empresa.endereco,
                telefone: empresa.telefone,
                email: empresa.email,
                logo_url: temLogo ? LOGO_PUBLICA : null,
                atualizado_em: empresa.atualizado_em.toISOString(),
              }
            : null
        }
      />
    </div>
  );
}
