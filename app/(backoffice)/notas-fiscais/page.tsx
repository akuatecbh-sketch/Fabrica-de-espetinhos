import { prisma } from "@/lib/prisma";
import { exigirAcesso } from "@/lib/permissoes";
import { ListaNfe } from "./lista-nfe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NotasFiscaisPage() {
  await exigirAcesso("vendas");
  const notas = await prisma.nfe.findMany({
    orderBy: [{ data_emissao: "desc" }, { id: "desc" }],
    include: {
      cliente: {
        select: {
          nome: true,
          razao_social: true,
          nome_fantasia: true,
          tipo_pessoa: true,
        },
      },
      nfe_item: { orderBy: { id: "asc" } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notas fiscais</h1>
        <p className="text-sm text-texto-secundario">
          NF-e modelo 55 emitidas ou simuladas para clientes pessoa jurídica.
        </p>
      </div>
      <ListaNfe
        notas={notas.map((nota) => ({
          id: nota.id,
          venda_id: nota.venda_id,
          numero: nota.numero,
          status: nota.status,
          valor_total: nota.valor_total.toString(),
          data_emissao: nota.data_emissao?.toISOString() ?? null,
          mensagem_sefaz: nota.mensagem_sefaz,
          xml_url: nota.xml_url,
          danfe_url: nota.danfe_url,
          clienteNome:
            nota.cliente?.razao_social?.trim() ||
            nota.cliente?.nome ||
            "Cliente não informado",
          itens: nota.nfe_item.map((item) => ({
            id: item.id,
            descricao: item.descricao,
            quantidade: item.quantidade.toString(),
            valor_total: item.valor_total.toString(),
            valor_icms: item.valor_icms.toString(),
            valor_ipi: item.valor_ipi.toString(),
            valor_pis: item.valor_pis.toString(),
            valor_cofins: item.valor_cofins.toString(),
          })),
        }))}
      />
    </div>
  );
}
