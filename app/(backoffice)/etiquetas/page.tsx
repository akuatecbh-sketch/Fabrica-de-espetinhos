import { LOGO_PUBLICA, existeLogoBlob } from "@/lib/empresa-logo";
import { previewDeRegistro, serializarModelo } from "@/lib/etiquetas";
import { prisma } from "@/lib/prisma";
import { exigirAcesso } from "@/lib/permissoes";
import { SELECT_USUARIO_RELACAO } from "@/lib/visibilidade";
import { EtiquetasForm } from "./formulario";
import { EtiquetasHistorico } from "./historico";
import { EtiquetasPreview } from "./preview";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string; impressao?: string }>;
};

export default async function EtiquetasPage({ searchParams }: Props) {
  const usuario = await exigirAcesso("etiquetas");
  const { q: buscaBruta, impressao: impressaoBruta } = await searchParams;
  const busca = (buscaBruta ?? "").trim();
  const impressaoId = Number(impressaoBruta);

  const [modelos, historico, impressao, empresa, temLogo] = await Promise.all([
    prisma.modelo_etiqueta.findMany({
      where: { ativo: true },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
    prisma.etiqueta_impressao.findMany({
      where: busca
        ? {
            OR: [
              { lote: { contains: busca, mode: "insensitive" } },
              {
                produto: { nome: { contains: busca, mode: "insensitive" } },
              },
            ],
          }
        : undefined,
      orderBy: { criado_em: "desc" },
      take: 40,
      include: {
        produto: { select: { nome: true } },
        usuario: { select: SELECT_USUARIO_RELACAO },
      },
    }),
    Number.isInteger(impressaoId) && impressaoId > 0
      ? prisma.etiqueta_impressao.findUnique({
          where: { id: impressaoId },
          include: {
            produto: {
              select: {
                nome: true,
                codigo_barras: true,
                preco_venda: true,
                vendido_por_peso: true,
                peso_aproximado_g: true,
                ingredientes: true,
                contem_alergenicos: true,
                pode_conter_tracos: true,
              },
            },
            modelo_etiqueta: true,
          },
        })
      : Promise.resolve(null),
    prisma.empresa.findUnique({
      where: { id: 1 },
      select: {
        razao_social: true,
        nome_fantasia: true,
        logo_url: true,
      },
    }),
    existeLogoBlob(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="print-ocultar">
        <h1 className="text-2xl font-semibold tracking-tight">Etiquetas</h1>
        <p className="mt-1 text-sm text-texto-secundario">
          Gere etiquetas com código de barras, lote e validade para produtos
          finais e de revenda.
        </p>
      </div>

      <EtiquetasForm modelos={modelos.map(serializarModelo)} />

      {impressao ? (
        <EtiquetasPreview
          preview={previewDeRegistro(
            impressao,
            empresa
              ? { ...empresa, logo_url: temLogo ? LOGO_PUBLICA : null }
              : null,
          )}
        />
      ) : null}

      <EtiquetasHistorico
        itens={historico}
        busca={busca}
        perfilLogado={usuario.perfil}
      />
    </div>
  );
}
