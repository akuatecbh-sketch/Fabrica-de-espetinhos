import { prisma } from "@/lib/prisma";
import { formatarDataHora } from "@/lib/format";
import {
  classesCardStatusSaude,
  classesStatusSaude,
  horasDesde,
  rotuloCategoriaSaude,
  rotuloStatusSaude,
} from "@/lib/saude";
import { exigirModulo } from "@/lib/sessao";
import { ListaExecucoesSaude } from "./lista-execucoes";

export const dynamic = "force-dynamic";

const LIMITE_HISTORICO = 30;
const LIMITE_ATENCAO = 7;
const HORAS_ATRASO_AGENDADOR = 26;

export default async function SaudePage() {
  await exigirModulo("saude");

  const execucoes = await prisma.verificacao_saude_execucao.findMany({
    orderBy: { iniciado_em: "desc" },
    take: LIMITE_HISTORICO,
    include: {
      verificacao_saude_item: { orderBy: { id: "asc" } },
    },
  });

  const ultima = execucoes[0] ?? null;
  const referenciaUltima = ultima
    ? (ultima.finalizado_em ?? ultima.iniciado_em)
    : null;
  const agendadorParado =
    referenciaUltima != null &&
    horasDesde(referenciaUltima) > HORAS_ATRASO_AGENDADOR;

  const atencao = execucoes.slice(0, LIMITE_ATENCAO).flatMap((execucao) =>
    execucao.verificacao_saude_item
      .filter((item) => item.resultado === "erro" && !item.correcao_aplicada)
      .map((item) => ({
        id: item.id,
        titulo: item.titulo,
        mensagem: item.mensagem,
        categoria: item.categoria,
        execucaoId: execucao.id,
        quando: execucao.finalizado_em ?? execucao.iniciado_em,
      })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Saúde do sistema
        </h1>
        <p className="mt-1 text-sm text-texto-secundario">
          Resultado das verificações diárias. A execução é feita pelo
          agendador, não por esta tela.
        </p>
      </div>

      {atencao.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Precisa da sua atenção</h2>
          <div className="rounded border border-vermelho-erro/40 bg-vermelho-erro/10 p-4">
            <ul className="flex flex-col gap-3">
              {atencao.map((item) => (
                <li key={item.id} className="text-sm">
                  <p className="font-medium text-texto-primario">{item.titulo}</p>
                  <p className="text-texto-secundario">{item.mensagem}</p>
                  <p className="mt-1 text-xs text-texto-secundario">
                    {rotuloCategoriaSaude(item.categoria)} · execução #
                    {item.execucaoId} · {formatarDataHora(item.quando)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {agendadorParado ? (
        <p className="rounded border border-zinc-200 bg-ambar/10 px-3 py-2 text-sm text-ambar-texto">
          A verificação diária não roda há mais de 24h — confira o agendador.
        </p>
      ) : null}

      {ultima ? (
        <section
          className={`rounded border px-4 py-3 ${classesCardStatusSaude(ultima.status_geral)}`}
        >
          <p className="text-xs text-texto-secundario">Status atual</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={classesStatusSaude(ultima.status_geral)}>
              {rotuloStatusSaude(ultima.status_geral)}
            </span>
          </div>
          <p className="mt-2 text-sm text-texto-primario">
            Última execução{" "}
            {formatarDataHora(ultima.finalizado_em ?? ultima.iniciado_em)}
          </p>
          <p className="text-sm text-texto-secundario">
            {ultima.correcoes_aplicadas} correção
            {ultima.correcoes_aplicadas === 1 ? "" : "ões"} aplicada
            {ultima.correcoes_aplicadas === 1 ? "" : "s"} automaticamente
          </p>
        </section>
      ) : (
        <p className="text-sm text-texto-secundario">
          Nenhuma verificação foi executada ainda.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Histórico</h2>
        <ListaExecucoesSaude execucoes={execucoes} />
      </section>
    </div>
  );
}
