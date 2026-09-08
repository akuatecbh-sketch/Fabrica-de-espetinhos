"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { formatarPreco } from "@/lib/format";
import { arredondarDinheiro } from "@/lib/dinheiro";
import { resolverTaxa } from "@/lib/taxa";
import { type TipoCupom } from "@/lib/tipo-cupom";
import { finalizarVenda } from "./actions";

type Forma = { id: number; nome: string; tipo: string };
type Taxa = {
  id: number;
  forma_pagamento_id: number;
  numero_parcelas: number;
  percentual: number;
};
type PagamentoRascunho = {
  forma_pagamento_id: number;
  nome: string;
  tipo: string;
  valor: number;
  numero_parcelas: number;
  percentual: number;
  valor_taxa: number;
  valor_liquido: number;
};

function calcularRestante(total: number, pagamentos: PagamentoRascunho[]) {
  let restante = total;
  for (const pagamento of pagamentos) {
    if (pagamento.tipo === "dinheiro" && pagamento.valor > restante) {
      restante = 0;
    } else {
      restante = arredondarDinheiro(restante - pagamento.valor);
    }
  }
  return Math.max(0, restante);
}

export function PagamentoModal({
  vendaId,
  total,
  formas,
  taxas,
  clientePessoaJuridica = false,
}: {
  vendaId: number;
  total: number;
  formas: Forma[];
  taxas: Taxa[];
  clientePessoaJuridica?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [pagamentos, setPagamentos] = useState<PagamentoRascunho[]>([]);
  const [formaId, setFormaId] = useState(formas[0]?.id ?? 0);
  const [valor, setValor] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [tipoCupom, setTipoCupom] = useState<TipoCupom>("fiscal");
  const [cupomNaoFiscalId, setCupomNaoFiscalId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  useEffect(() => {
    if (!clientePessoaJuridica && tipoCupom === "nfe") {
      setTipoCupom("fiscal");
    }
  }, [clientePessoaJuridica, tipoCupom]);

  const forma = formas.find((item) => item.id === formaId) ?? formas[0];
  const restante = useMemo(
    () => calcularRestante(total, pagamentos),
    [total, pagamentos],
  );
  const numeroParcelas = forma?.tipo === "credito" ? parcelas : 1;
  const preview = forma
    ? resolverTaxa({
        tipo: forma.tipo,
        formaPagamentoId: forma.id,
        numeroParcelas,
        taxas,
      })
    : { taxa_cartao_id: null, percentual: 0 };
  const valorNumero = arredondarDinheiro(Number(valor.replace(",", ".")) || 0);
  const valorTaxaPreview = arredondarDinheiro(
    (valorNumero * preview.percentual) / 100,
  );
  const valorLiquidoPreview = arredondarDinheiro(valorNumero - valorTaxaPreview);
  const trocoPreview =
    forma?.tipo === "dinheiro" && valorNumero > restante
      ? arredondarDinheiro(valorNumero - restante)
      : 0;

  function adicionarPagamento() {
    if (!forma) {
      setErro("Cadastre uma forma de pagamento.");
      return;
    }
    if (valorNumero <= 0) {
      setErro("Informe o valor deste pagamento.");
      return;
    }
    if (forma.tipo !== "dinheiro" && valorNumero - restante > 0.001) {
      setErro(`O pagamento em ${forma.nome} não pode ser maior que o restante.`);
      return;
    }
    setPagamentos((atual) => [
      ...atual,
      {
        forma_pagamento_id: forma.id,
        nome: forma.nome,
        tipo: forma.tipo,
        valor: valorNumero,
        numero_parcelas: numeroParcelas,
        percentual: preview.percentual,
        valor_taxa: valorTaxaPreview,
        valor_liquido: valorLiquidoPreview,
      },
    ]);
    setValor("");
    setErro(null);
  }

  function confirmar() {
    if (restante > 0.001) {
      setErro("A soma dos pagamentos deve cobrir o total da venda.");
      return;
    }
    startTransition(async () => {
      const resultado = await finalizarVenda(
        vendaId,
        pagamentos.map((pagamento) => ({
          forma_pagamento_id: pagamento.forma_pagamento_id,
          valor: pagamento.valor,
          numero_parcelas: pagamento.numero_parcelas,
        })),
        tipoCupom,
      );
      if (resultado.error) {
        setErro(resultado.error);
        return;
      }
      if (resultado.tipo_cupom === "nao_fiscal") {
        const id = resultado.vendaId ?? vendaId;
        setCupomNaoFiscalId(id);
        setPagamentos([]);
        window.open(`/vendas/${id}/cupom`, "_blank", "noopener,noreferrer");
        return;
      }
      setAberto(false);
      setPagamentos([]);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAberto(true);
          setPagamentos([]);
          setValor(String(total));
          setTipoCupom("fiscal");
          setCupomNaoFiscalId(null);
          setErro(null);
        }}
        className="min-h-11 rounded bg-gradiente-brasa px-3 py-2 text-sm font-medium text-white lg:min-h-0"
      >
        Finalizar venda
      </button>

      {aberto ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 md:items-start md:justify-center md:overflow-y-auto md:p-4">
          <div className="sheet-mobile flex h-[100dvh] w-full flex-col overflow-y-auto bg-superficie p-5 md:mt-8 md:h-auto md:max-w-xl md:rounded md:border md:border-borda md:shadow-lg md:[animation:none]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-medium">Pagamento — venda #{vendaId}</h2>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded text-sm font-medium text-texto-primario md:min-h-0 md:min-w-0"
              >
                Fechar
              </button>
            </div>

            {cupomNaoFiscalId != null ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-texto-primario">
                  Venda finalizada. Este cupom não tem valor fiscal.
                </p>
                <a
                  href={`/vendas/${cupomNaoFiscalId}/cupom`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded bg-gradiente-brasa px-3 py-2 text-center text-sm font-medium text-white md:min-h-0"
                >
                  Imprimir cupom não fiscal
                </a>
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="min-h-11 rounded border border-borda bg-superficie px-3 py-2 text-sm text-texto-primario hover:bg-fundo-hover md:min-h-0"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
            <p className="mb-4 text-sm">
              Total: <strong className="font-data">{formatarPreco(total)}</strong>
              {" · "}
              Restante: <strong className="font-data">{formatarPreco(restante)}</strong>
            </p>

            {erro ? (
              <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {erro}
              </p>
            ) : null}

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Forma de pagamento
                <select
                  value={formaId}
                  onChange={(evento) => setFormaId(Number(evento.target.value))}
                  className="rounded border border-zinc-300 px-3 py-2"
                >
                  {formas.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </label>

              {forma?.tipo === "credito" ? (
                <label className="flex flex-col gap-1 text-sm">
                  Parcelas
                  <select
                    value={parcelas}
                    onChange={(evento) =>
                      setParcelas(Number(evento.target.value))
                    }
                    className="rounded border border-zinc-300 px-3 py-2"
                  >
                    {Array.from({ length: 12 }, (_, indice) => indice + 1).map(
                      (n) => (
                        <option key={n} value={n}>
                          {n}x
                        </option>
                      ),
                    )}
                  </select>
                </label>
              ) : null}

              <label className="flex flex-col gap-1 text-sm">
                Valor
                <input
                  value={valor}
                  onChange={(evento) => setValor(evento.target.value)}
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="rounded border border-zinc-300 px-3 py-2"
                />
              </label>

              {forma && forma.tipo !== "dinheiro" && forma.tipo !== "fiado" ? (
                <p className="text-sm text-texto-secundario">
                  Taxa: <span className="font-data">{preview.percentual.toFixed(2)}%</span> · taxa{" "}
                  <span className="font-data">{formatarPreco(valorTaxaPreview)}</span> · líquido{" "}
                  <span className="font-data">{formatarPreco(valorLiquidoPreview)}</span>
                  {preview.percentual === 0
                    ? " (nenhuma taxa vigente cadastrada)"
                    : ""}
                </p>
              ) : null}

              {trocoPreview > 0 ? (
                <p className="text-sm text-texto-secundario">
                  Troco: <span className="font-data">{formatarPreco(trocoPreview)}</span>
                </p>
              ) : null}

              <button
                type="button"
                onClick={adicionarPagamento}
                className="min-h-11 rounded border border-borda bg-superficie px-3 py-2 text-sm text-texto-primario hover:bg-fundo-hover md:min-h-0"
              >
                Adicionar pagamento
              </button>
            </div>

            <ul className="mt-4 divide-y divide-zinc-100 rounded border border-zinc-200">
              {pagamentos.length === 0 ? (
                <li className="px-3 py-2 text-sm text-zinc-600">
                  Nenhum pagamento adicionado.
                </li>
              ) : (
                pagamentos.map((pagamento, indice) => (
                  <li
                    key={`${pagamento.forma_pagamento_id}-${indice}`}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span>
                      {pagamento.nome}
                      {pagamento.tipo === "credito"
                        ? ` ${pagamento.numero_parcelas}x`
                        : ""}
                      {pagamento.percentual > 0
                        ? ` · taxa ${pagamento.percentual.toFixed(2)}%`
                        : ""}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-data">{formatarPreco(pagamento.valor)}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setPagamentos((atual) =>
                            atual.filter((_, i) => i !== indice),
                          )
                        }
                        className="inline-flex min-h-11 items-center text-red-700 hover:underline md:min-h-0"
                      >
                        Remover
                      </button>
                    </span>
                  </li>
                ))
              )}
            </ul>

            <fieldset className="mt-4 flex flex-col gap-2">
              <legend className="text-sm font-medium">Tipo de cupom</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tipo_cupom"
                  value="fiscal"
                  checked={tipoCupom === "fiscal"}
                  onChange={() => setTipoCupom("fiscal")}
                />
                Cupom fiscal (NFC-e)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tipo_cupom"
                  value="nao_fiscal"
                  checked={tipoCupom === "nao_fiscal"}
                  onChange={() => setTipoCupom("nao_fiscal")}
                />
                Cupom não fiscal
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tipo_cupom"
                  value="nenhum"
                  checked={tipoCupom === "nenhum"}
                  onChange={() => setTipoCupom("nenhum")}
                />
                Nenhum
              </label>
              {clientePessoaJuridica ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="tipo_cupom"
                    value="nfe"
                    checked={tipoCupom === "nfe"}
                    onChange={() => setTipoCupom("nfe")}
                  />
                  NF-e (Nota Fiscal Eletrônica)
                </label>
              ) : null}
            </fieldset>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="min-h-11 rounded border border-borda bg-superficie px-3 py-2 text-sm text-texto-primario hover:bg-fundo-hover md:min-h-0"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={pendente || restante > 0.001 || pagamentos.length === 0}
                onClick={confirmar}
                className="min-h-11 rounded bg-gradiente-brasa px-3 py-2 text-sm font-medium text-white disabled:opacity-60 md:min-h-0"
              >
                {pendente ? "Finalizando..." : "Confirmar finalização"}
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
