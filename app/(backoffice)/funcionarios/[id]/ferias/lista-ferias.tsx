import { formatarData } from "@/lib/format";
import {
  classesAlertaFerias,
  classesStatusFerias,
  feriasComPrazoApertado,
  rotuloAlertaFerias,
  rotuloStatusFerias,
} from "@/lib/rh";
import { CardRegistro } from "../../../card-registro";
import { AcoesPeriodo } from "./acoes-periodo";

type Periodo = {
  id: number;
  periodo_aquisitivo_inicio: Date;
  periodo_aquisitivo_fim: Date;
  data_inicio_programada: Date | null;
  data_fim_programada: Date | null;
  dias_gozados: number | null;
  dias_vendidos: number | null;
  status: string;
};

export function ListaFerias({
  funcionarioId,
  periodos,
  hoje,
}: {
  funcionarioId: number;
  periodos: Periodo[];
  hoje: Date;
}) {
  if (periodos.length === 0) {
    return (
      <p className="text-sm text-texto-secundario">
        Nenhum período de férias lançado.
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {periodos.map((periodo) => {
          const alerta = feriasComPrazoApertado(
            periodo.status,
            periodo.periodo_aquisitivo_fim,
            hoje,
          );
          return (
            <li key={periodo.id}>
              <CardRegistro
                acoes={
                  <AcoesPeriodo
                    funcionarioId={funcionarioId}
                    periodo={periodo}
                  />
                }
              >
                <p className="font-medium text-texto-primario">
                  {formatarData(periodo.periodo_aquisitivo_inicio)} a{" "}
                  {formatarData(periodo.periodo_aquisitivo_fim)}
                </p>
                <span className="mt-1 flex flex-wrap gap-1">
                  <span className={classesStatusFerias(periodo.status)}>
                    {rotuloStatusFerias(periodo.status)}
                  </span>
                  {alerta ? (
                    <span
                      className={classesAlertaFerias(
                        periodo.periodo_aquisitivo_fim,
                        hoje,
                      )}
                    >
                      {rotuloAlertaFerias(periodo.periodo_aquisitivo_fim, hoje)}
                    </span>
                  ) : null}
                </span>
                <p className="mt-1 text-sm text-texto-secundario">
                  {periodo.dias_gozados != null
                    ? `${periodo.dias_gozados} dia(s) gozados`
                    : "Dias ainda não programados"}
                  {periodo.dias_vendidos
                    ? ` · ${periodo.dias_vendidos} vendido(s)`
                    : ""}
                </p>
                {periodo.data_inicio_programada && periodo.data_fim_programada ? (
                  <p className="text-sm text-texto-secundario">
                    Programado: {formatarData(periodo.data_inicio_programada)} a{" "}
                    {formatarData(periodo.data_fim_programada)}
                  </p>
                ) : null}
              </CardRegistro>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 font-medium">Período aquisitivo</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Dias</th>
              <th className="px-3 py-2 font-medium">Programado</th>
              <th className="px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {periodos.map((periodo) => {
              const alerta = feriasComPrazoApertado(
                periodo.status,
                periodo.periodo_aquisitivo_fim,
                hoje,
              );
              return (
                <tr
                  key={periodo.id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="px-3 py-2">
                    {formatarData(periodo.periodo_aquisitivo_inicio)} a{" "}
                    {formatarData(periodo.periodo_aquisitivo_fim)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex flex-wrap gap-1">
                      <span className={classesStatusFerias(periodo.status)}>
                        {rotuloStatusFerias(periodo.status)}
                      </span>
                      {alerta ? (
                        <span
                          className={classesAlertaFerias(
                            periodo.periodo_aquisitivo_fim,
                            hoje,
                          )}
                        >
                          {rotuloAlertaFerias(
                            periodo.periodo_aquisitivo_fim,
                            hoje,
                          )}
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-data">
                    {periodo.dias_gozados != null
                      ? `${periodo.dias_gozados} gozados`
                      : "—"}
                    {periodo.dias_vendidos
                      ? ` · ${periodo.dias_vendidos} vendidos`
                      : ""}
                  </td>
                  <td className="px-3 py-2">
                    {periodo.data_inicio_programada &&
                    periodo.data_fim_programada
                      ? `${formatarData(periodo.data_inicio_programada)} a ${formatarData(periodo.data_fim_programada)}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <AcoesPeriodo
                      funcionarioId={funcionarioId}
                      periodo={periodo}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
