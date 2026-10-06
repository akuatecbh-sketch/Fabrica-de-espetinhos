import Link from "next/link";
import { SeletorPeriodo } from "@/components/seletor-periodo";
import { prisma } from "@/lib/prisma";
import { exigirAcesso } from "@/lib/permissoes";
import { periodoDaUrlComPadrao, periodoMesAtual } from "@/lib/periodo";
import { SELECT_USUARIO_RELACAO, nomeExibicao } from "@/lib/visibilidade";
import { ListaHistoricoProducao } from "./lista-historico";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<{ de?: string; ate?: string }>;
};

export default async function ProducaoPage({ searchParams }: Props) {
  const usuario = await exigirAcesso("producao");
  const params = await searchParams;
  const periodo = periodoDaUrlComPadrao(params.de, params.ate, periodoMesAtual());
  const inicio = new Date(`${periodo.de}T00:00:00.000Z`);
  const fim = new Date(`${periodo.ate}T00:00:00.000Z`);

  const registros = await prisma.producao.findMany({
    where: {
      data: { gte: inicio, lte: fim },
    },
    include: {
      produto: {
        include: { unidade_medida: { select: { sigla: true } } },
      },
      usuario: { select: SELECT_USUARIO_RELACAO },
    },
    orderBy: [{ data: "desc" }, { id: "desc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produção</h1>
          <p className="mt-1 text-sm text-texto-secundario">
            Baixa os insumos da ficha técnica e entra o produto final.
          </p>
        </div>
        <Link
          href="/producao/nova"
          className="inline-flex min-h-11 items-center rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
        >
          Nova produção
        </Link>
      </div>

      <SeletorPeriodo
        key={`${periodo.de}-${periodo.ate}`}
        rota="/producao"
        de={periodo.de}
        ate={periodo.ate}
      />

      <ListaHistoricoProducao
        de={periodo.de}
        ate={periodo.ate}
        itens={registros.map((item) => ({
          id: item.id,
          data: item.data,
          quantidade: Number(item.quantidade),
          custoTotal: Number(item.custo_total),
          status: item.status,
          observacao: item.observacao,
          produtoNome: item.produto.nome,
          unidade: item.produto.unidade_medida.sigla,
          usuarioNome: nomeExibicao(item.usuario, usuario.perfil).nome,
        }))}
      />
    </div>
  );
}
