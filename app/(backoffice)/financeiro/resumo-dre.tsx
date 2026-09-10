import Link from "next/link";
import { formatarPreco } from "@/lib/format";
import type { ResumoDreMes } from "@/lib/resumo-financeiro";
import { SeletorMes } from "./seletor-mes";

function LinhaDre({
  rotulo,
  valor,
  destaque,
  classeValor,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
  classeValor?: string;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 ${
        destaque ? "pt-3" : ""
      }`}
    >
      <dt
        className={
          destaque
            ? "text-sm font-medium text-texto-primario"
            : "text-sm text-texto-secundario"
        }
      >
        {rotulo}
      </dt>
      <dd
        className={`font-data text-right ${
          destaque ? "text-lg font-semibold" : "text-sm font-medium"
        } ${classeValor ?? "text-texto-primario"}`}
      >
        {formatarPreco(valor)}
      </dd>
    </div>
  );
}

export function ResumoDre({ dados }: { dados: ResumoDreMes }) {
  const classeResultado =
    dados.resultado > 0
      ? "text-verde-texto"
      : dados.resultado < 0
        ? "text-vermelho-erro"
        : "text-texto-primario";

  return (
    <div className="flex flex-col gap-6">
      <SeletorMes key={dados.mes} mes={dados.mes} aba="resumo" />

      <section className="rounded border border-zinc-200 bg-white px-4 py-4 sm:px-5">
        <h2 className="text-sm font-medium text-texto-primario">
          Resultado de {dados.rotuloMes}
        </h2>
        <dl className="mt-4 flex flex-col gap-2">
          <LinhaDre rotulo="Receita bruta" valor={dados.receitaBruta} />
          <LinhaDre
            rotulo="(-) Taxas de cartão"
            valor={dados.taxasCartao}
          />
          <LinhaDre
            rotulo="(=) Receita líquida"
            valor={dados.receitaLiquida}
            destaque
          />
          <LinhaDre
            rotulo="(-) Despesas fixas"
            valor={dados.despesasFixas}
          />
          <LinhaDre
            rotulo="(-) Despesas variáveis"
            valor={dados.despesasVariaveis}
          />
          <div className="mt-1 border-t border-zinc-200">
            <LinhaDre
              rotulo="(=) Resultado do mês"
              valor={dados.resultado}
              destaque
              classeValor={classeResultado}
            />
          </div>
        </dl>
      </section>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/financeiro?aba=despesas&filtro=pendentes"
          className="rounded border border-zinc-200 bg-white px-4 py-3 hover:bg-zinc-50"
        >
          <dt className="text-xs text-texto-secundario">A pagar em aberto</dt>
          <dd className="font-data text-lg font-medium">
            {formatarPreco(dados.totalPagarAberto)}
          </dd>
        </Link>
        <Link
          href="/financeiro?aba=receber&filtro=pendentes"
          className="rounded border border-zinc-200 bg-white px-4 py-3 hover:bg-zinc-50"
        >
          <dt className="text-xs text-texto-secundario">A receber em aberto</dt>
          <dd className="font-data text-lg font-medium">
            {formatarPreco(dados.totalReceberAberto)}
          </dd>
        </Link>
        <Link
          href="/financeiro?aba=despesas&status=atrasada"
          className="rounded border border-zinc-200 bg-white px-4 py-3 hover:bg-zinc-50"
        >
          <dt className="text-xs text-texto-secundario">Contas vencidas</dt>
          <dd className="font-data text-lg font-medium">
            {dados.qtdContasVencidas}
          </dd>
        </Link>
      </dl>
    </div>
  );
}
