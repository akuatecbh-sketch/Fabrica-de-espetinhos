import { formatarDataHora } from "@/lib/format";
import {
  classesStatusSaude,
  rotuloCategoriaSaude,
  rotuloStatusSaude,
} from "@/lib/saude";

type Item = {
  id: number;
  titulo: string;
  categoria: string;
  resultado: string;
  mensagem: string;
  correcao_aplicada: boolean;
};

type Execucao = {
  id: number;
  iniciado_em: Date;
  finalizado_em: Date | null;
  status_geral: string;
  correcoes_aplicadas: number;
  total_ok: number;
  total_avisos: number;
  total_erros: number;
  verificacao_saude_item: Item[];
};

export function ListaExecucoesSaude({ execucoes }: { execucoes: Execucao[] }) {
  if (execucoes.length === 0) {
    return (
      <p className="text-sm text-texto-secundario">
        Nenhum histórico para exibir.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {execucoes.map((execucao) => (
        <details
          key={execucao.id}
          className="rounded-lg border border-zinc-200 bg-white"
        >
          <summary className="cursor-pointer list-none px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-zinc-900">
                  Execução #{execucao.id}
                  <span className="ml-2 font-normal text-zinc-500">
                    {formatarDataHora(
                      execucao.finalizado_em ?? execucao.iniciado_em,
                    )}
                  </span>
                </p>
                <p className="text-sm text-zinc-600">
                  {execucao.correcoes_aplicadas} correção
                  {execucao.correcoes_aplicadas === 1 ? "" : "ões"} ·{" "}
                  {execucao.total_ok} ok · {execucao.total_avisos} aviso
                  {execucao.total_avisos === 1 ? "" : "s"} ·{" "}
                  {execucao.total_erros} erro
                  {execucao.total_erros === 1 ? "" : "s"}
                </p>
              </div>
              <span className={classesStatusSaude(execucao.status_geral)}>
                {rotuloStatusSaude(execucao.status_geral)}
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Clique para ver as verificações
            </p>
          </summary>
          <div className="border-t border-zinc-200 px-4 py-3">
            {execucao.verificacao_saude_item.length === 0 ? (
              <p className="text-sm text-zinc-600">Nenhum item nesta execução.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {execucao.verificacao_saude_item.map((item) => (
                  <li key={item.id} className="text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-texto-primario">
                        {item.titulo}
                      </p>
                      <span className={classesStatusSaude(item.resultado)}>
                        {rotuloStatusSaude(item.resultado)}
                      </span>
                    </div>
                    <p className="text-xs text-texto-secundario">
                      {rotuloCategoriaSaude(item.categoria)}
                    </p>
                    <p className="mt-1 text-texto-secundario">{item.mensagem}</p>
                    {item.correcao_aplicada ? (
                      <p className="mt-1 text-xs font-medium text-verde-sucesso">
                        Correção automática: {item.mensagem}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
