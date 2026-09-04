"use client";

import { useActionState, useEffect, useState } from "react";
import { BuscaAutocomplete } from "@/components/busca-autocomplete";
import {
  avisoRotuloCompacto,
  calcularPrecoPorPeso,
  dataLocalISO,
  loteSugerido,
  parseDecimalBr,
  somarDiasIso,
  type ModeloEtiqueta,
} from "@/lib/etiquetas";
import { formatarPreco } from "@/lib/format";
import {
  buscarProdutosEtiqueta,
  gerarEtiquetas,
  type EtiquetaFormState,
  type ProdutoEtiquetaBusca,
} from "./actions";

const estadoInicial: EtiquetaFormState = {};

function detalheProduto(produto: ProdutoEtiquetaBusca) {
  const partes = [
    produto.codigo,
    produto.codigo_barras,
    produto.vendido_por_peso ? "R$/kg" : null,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : null;
}

export function EtiquetasForm({ modelos }: { modelos: ModeloEtiqueta[] }) {
  const [estado, formAction, pendente] = useActionState(
    gerarEtiquetas,
    estadoInicial,
  );
  const [selecionado, setSelecionado] = useState<ProdutoEtiquetaBusca | null>(
    null,
  );
  const [modeloId, setModeloId] = useState(
    modelos[0] ? String(modelos[0].id) : "",
  );
  const [fabricacao, setFabricacao] = useState(dataLocalISO());
  const [acondicionamento, setAcondicionamento] = useState(dataLocalISO());
  const [acondManual, setAcondManual] = useState(false);
  const [lote, setLote] = useState("");
  const [validade, setValidade] = useState("");
  const [validadeManual, setValidadeManual] = useState(false);
  const [peso, setPeso] = useState("");

  const modeloSelecionado = modelos.find((m) => String(m.id) === modeloId);
  const avisoModelo =
    selecionado && modeloSelecionado
      ? avisoRotuloCompacto(modeloSelecionado, {
          pesoAproximadoG: selecionado.vendido_por_peso
            ? null
            : selecionado.peso_aproximado_g,
          ingredientes: selecionado.ingredientes,
          contemAlergenicos: selecionado.contem_alergenicos,
          podeConterTracos: selecionado.pode_conter_tracos,
        })
      : null;
  const precoPorKg = selecionado?.preco_venda
    ? Number(selecionado.preco_venda)
    : null;
  const pesoNumero = parseDecimalBr(peso);
  const precoMercadoria =
    selecionado?.vendido_por_peso &&
    pesoNumero != null &&
    !Number.isNaN(pesoNumero) &&
    precoPorKg != null &&
    !Number.isNaN(precoPorKg)
      ? calcularPrecoPorPeso(pesoNumero, precoPorKg)
      : null;

  useEffect(() => {
    if (!selecionado) return;
    setLote(loteSugerido(selecionado.id, fabricacao));
  }, [selecionado, fabricacao]);

  useEffect(() => {
    if (validadeManual) return;
    if (selecionado?.dias_validade != null) {
      setValidade(somarDiasIso(fabricacao, selecionado.dias_validade));
    } else {
      setValidade("");
    }
  }, [fabricacao, selecionado, validadeManual]);

  useEffect(() => {
    if (acondManual) return;
    setAcondicionamento(fabricacao);
  }, [fabricacao, acondManual]);

  return (
    <form
      action={formAction}
      className="print-ocultar flex w-full max-w-xl flex-col gap-4"
    >
      {estado.error ? (
        <p className="rounded border border-vermelho-erro/40 bg-vermelho-erro/10 px-3 py-2 text-sm text-vermelho-erro">
          {estado.error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Modelo de etiqueta
        <select
          name="modelo_etiqueta_id"
          required
          value={modeloId}
          onChange={(evento) => setModeloId(evento.target.value)}
          className="min-h-11 rounded border border-borda px-3 py-2"
        >
          {modelos.length === 0 ? (
            <option value="">Nenhum modelo cadastrado</option>
          ) : null}
          {modelos.map((modelo) => (
            <option key={modelo.id} value={modelo.id}>
              {modelo.nome}
            </option>
          ))}
        </select>
      </label>
      {avisoModelo ? (
        <p className="rounded border border-borda bg-fundo px-3 py-2 text-sm text-texto-secundario">
          {avisoModelo}
        </p>
      ) : null}

      <input type="hidden" name="produto_id" value={selecionado?.id ?? ""} />
      <BuscaAutocomplete
        buscar={buscarProdutosEtiqueta}
        label="Buscar produto"
        placeholder="Nome, código ou código de barras"
        chave={(produto) => produto.id}
        rotulo={(produto) => produto.nome}
        descricao={detalheProduto}
        aoSelecionar={(produto) => {
          setSelecionado(produto);
          setValidadeManual(false);
          setPeso("");
        }}
        aoAlterar={() => {
          setSelecionado(null);
          setValidadeManual(false);
          setPeso("");
        }}
      />

      {selecionado?.vendido_por_peso ? (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Peso do pacote (kg)
            <input
              name="peso_kg"
              inputMode="decimal"
              required
              value={peso}
              onChange={(evento) => setPeso(evento.target.value)}
              placeholder="0,487"
              className="min-h-11 rounded border border-borda px-3 py-2"
            />
          </label>
          <p className="rounded border border-borda bg-fundo px-3 py-2 text-sm">
            Preço da mercadoria:{" "}
            <span className="font-data font-semibold">
              {precoMercadoria != null
                ? formatarPreco(String(precoMercadoria))
                : "—"}
            </span>
            {precoPorKg != null && !Number.isNaN(precoPorKg) ? (
              <span className="ml-2 text-texto-secundario">
                ({formatarPreco(String(precoPorKg))}/kg)
              </span>
            ) : null}
          </p>
        </>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Quantidade de etiquetas
        <input
          name="quantidade"
          type="number"
          min={1}
          max={200}
          required
          defaultValue={10}
          className="min-h-11 rounded border border-borda px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Lote
        <input
          name="lote"
          required
          maxLength={80}
          value={lote}
          onChange={(evento) => setLote(evento.target.value)}
          className="min-h-11 rounded border border-borda px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Data de fabricação
        <input
          name="data_fabricacao"
          type="date"
          required
          value={fabricacao}
          onChange={(evento) => {
            setFabricacao(evento.target.value);
            setValidadeManual(false);
          }}
          className="min-h-11 rounded border border-borda px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Data de acondicionamento
        <input
          name="data_acondicionamento"
          type="date"
          required
          value={acondicionamento}
          onChange={(evento) => {
            setAcondicionamento(evento.target.value);
            setAcondManual(true);
          }}
          className="min-h-11 rounded border border-borda px-3 py-2"
        />
        <span className="text-xs text-texto-secundario">
          Padrão: igual à fabricação. Pode ser alterada à parte.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Data de validade
        <input
          name="data_validade"
          type="date"
          value={validade}
          onChange={(evento) => {
            setValidade(evento.target.value);
            setValidadeManual(true);
          }}
          className="min-h-11 rounded border border-borda px-3 py-2"
        />
        <span className="text-xs text-texto-secundario">
          {!selecionado
            ? "Selecione um produto para sugerir a validade."
            : selecionado.dias_validade != null
              ? `Sugestão: fabricação + ${selecionado.dias_validade} dia${
                  selecionado.dias_validade === 1 ? "" : "s"
                }.`
              : "Este produto não tem validade em dias. Preencha se quiser."}
        </span>
      </label>

      <button
        type="submit"
        disabled={pendente || !selecionado || !modeloId}
        className="min-h-11 rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Gerando..." : "Gerar etiquetas"}
      </button>
    </form>
  );
}
