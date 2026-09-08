"use client";

import { useActionState, useState, type FormEvent } from "react";
import { rotuloDescontoAtacado } from "@/lib/desconto-atacado";
import { ORIGENS_MERCADORIA } from "@/lib/classificacao-fiscal";
import type { ProdutoFormState } from "./actions";
import { CampoEstoque } from "./campo-estoque";
import { CategoriaCampo } from "./categoria-campo";

type Categoria = { id: number; nome: string; tipo: string };
type Unidade = { id: number; sigla: string; descricao: string };

type ProdutoInicial = {
  nome: string;
  codigo: string | null;
  codigo_barras: string | null;
  categoria_id: number;
  unidade_medida_id: number;
  preco_venda: string | null;
  estoque_minimo: string | null;
  estoque_ideal: string | null;
  estoque_maximo: string | null;
  estoque_atual: string | null;
  controla_estoque: boolean;
  dias_validade: number | null;
  vendido_por_peso: boolean;
  peso_aproximado_g: string | null;
  ingredientes: string | null;
  contem_alergenicos: string | null;
  pode_conter_tracos: string | null;
  permite_venda_pacote: boolean;
  quantidade_por_pacote: string | null;
  preco_pacote: string | null;
  ncm: string | null;
  cfop_padrao: string | null;
  origem_mercadoria: string | null;
  cst_csosn: string | null;
  aliquota_icms: string | null;
  aliquota_ipi: string | null;
  aliquota_pis: string | null;
  aliquota_cofins: string | null;
};

const estadoInicial: ProdutoFormState = {};

function numeroDoTexto(valor: string) {
  const bruto = valor.trim().replace(",", ".");
  if (!bruto) return null;
  const numero = Number(bruto);
  return Number.isFinite(numero) ? numero : NaN;
}

function quantidadeDoFormulario(formulario: HTMLFormElement, campo: string) {
  return numeroDoTexto(String(new FormData(formulario).get(campo) ?? "")) ?? 0;
}

function textoInicialQuantidade(valor?: string | null) {
  if (valor == null || valor.trim() === "") return "";
  const numero = Number(valor.replace(",", "."));
  if (!Number.isFinite(numero) || numero === 0) return "";
  return valor;
}

export function ProdutoForm({
  action,
  categorias,
  unidades,
  produto,
  submitLabel,
}: {
  action: (estado: ProdutoFormState, formData: FormData) => Promise<ProdutoFormState>;
  categorias: Categoria[];
  unidades: Unidade[];
  produto?: ProdutoInicial;
  submitLabel: string;
}) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [precoVenda, setPrecoVenda] = useState(produto?.preco_venda ?? "");
  const [vendidoPorPeso, setVendidoPorPeso] = useState(
    produto?.vendido_por_peso ?? false,
  );
  const [permitePacote, setPermitePacote] = useState(
    produto?.permite_venda_pacote ?? false,
  );
  const [quantidadePacote, setQuantidadePacote] = useState(
    produto?.permite_venda_pacote
      ? textoInicialQuantidade(produto.quantidade_por_pacote)
      : "",
  );
  const [precoPacote, setPrecoPacote] = useState(
    produto?.permite_venda_pacote ? (produto.preco_pacote ?? "") : "",
  );

  const rotuloDesconto = (() => {
    if (!permitePacote) return null;
    const venda = numeroDoTexto(precoVenda);
    const quantidade = numeroDoTexto(quantidadePacote);
    const pacote = numeroDoTexto(precoPacote);
    if (venda == null || quantidade == null || pacote == null) return null;
    if ([venda, quantidade, pacote].some((valor) => Number.isNaN(valor))) {
      return null;
    }
    return rotuloDescontoAtacado(venda, quantidade, pacote);
  })();

  function validarFormulario(evento: FormEvent<HTMLFormElement>) {
    const formulario = evento.currentTarget;
    const minimo = quantidadeDoFormulario(formulario, "estoque_minimo");
    const ideal = quantidadeDoFormulario(formulario, "estoque_ideal");
    const maximo = quantidadeDoFormulario(formulario, "estoque_maximo");
    const atual = quantidadeDoFormulario(formulario, "estoque_atual");

    if ([minimo, ideal, maximo, atual].some((valor) => Number.isNaN(valor))) {
      evento.preventDefault();
      setErroLocal("Informe quantidades de estoque válidas.");
      return;
    }

    if (minimo > ideal || ideal > maximo) {
      evento.preventDefault();
      setErroLocal(
        "O estoque mínimo deve ser menor ou igual ao estoque ideal, e o estoque ideal menor ou igual ao estoque máximo.",
      );
      return;
    }

    if (permitePacote) {
      const quantidade = numeroDoTexto(quantidadePacote);
      const pacote = numeroDoTexto(precoPacote);
      if (quantidade == null || Number.isNaN(quantidade) || quantidade <= 1) {
        evento.preventDefault();
        setErroLocal("Informe a quantidade por pacote (maior que 1).");
        return;
      }
      if (pacote == null || Number.isNaN(pacote)) {
        evento.preventDefault();
        setErroLocal("Informe o preço do pacote.");
        return;
      }
    }

    setErroLocal(null);
  }

  const erro = erroLocal ?? estado.error;

  return (
    <form
      action={formAction}
      onSubmit={validarFormulario}
      className="flex w-full max-w-xl flex-col gap-4"
    >
      {erro ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input
          name="nome"
          required
          maxLength={150}
          defaultValue={produto?.nome ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Código interno
        <input
          name="codigo"
          maxLength={30}
          defaultValue={produto?.codigo ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Código de barras
        <input
          name="codigo_barras"
          inputMode="numeric"
          maxLength={13}
          pattern="(\d{13})?"
          title="13 dígitos numéricos, ou deixe em branco para gerar automaticamente"
          defaultValue={produto?.codigo_barras?.trim() ?? ""}
          placeholder="Deixe em branco para gerar automaticamente"
          className="rounded border border-zinc-300 px-3 py-2"
        />
        <span className="text-xs text-zinc-500">
          Opcional. Se ficar em branco, um EAN-13 é gerado ao salvar.
        </span>
      </label>

      <CategoriaCampo
        categoriasIniciais={categorias}
        valorInicial={produto?.categoria_id}
      />

      <label className="flex flex-col gap-1 text-sm">
        Unidade de medida
        <select
          name="unidade_medida_id"
          required
          defaultValue={produto?.unidade_medida_id ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        >
          <option value="">Selecione</option>
          {unidades.map((unidade) => (
            <option key={unidade.id} value={unidade.id}>
              {unidade.sigla} — {unidade.descricao}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          name="vendido_por_peso"
          type="checkbox"
          checked={vendidoPorPeso}
          onChange={(evento) => setVendidoPorPeso(evento.target.checked)}
        />
        Vendido por peso (R$/kg)
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Preço de venda
        <input
          name="preco_venda"
          inputMode="decimal"
          placeholder="0"
          value={precoVenda}
          onChange={(evento) => setPrecoVenda(evento.target.value)}
          className="rounded border border-zinc-300 px-3 py-2"
        />
        {vendidoPorPeso ? (
          <span className="text-xs text-zinc-500">
            Este produto é vendido por peso: o valor acima é o preço por quilo
            (R$/kg), usado para calcular o preço da mercadoria nas etiquetas.
          </span>
        ) : null}
      </label>

      <CampoEstoque
        name="estoque_minimo"
        label="Estoque mínimo"
        valorInicial={produto?.estoque_minimo}
      />
      <CampoEstoque
        name="estoque_ideal"
        label="Estoque ideal"
        valorInicial={produto?.estoque_ideal}
      />
      <CampoEstoque
        name="estoque_maximo"
        label="Estoque máximo"
        valorInicial={produto?.estoque_maximo}
      />
      <CampoEstoque
        name="estoque_atual"
        label="Estoque atual"
        valorInicial={produto?.estoque_atual}
      />

      <label className="flex flex-col gap-1 text-sm">
        Validade (dias após fabricação)
        <input
          name="dias_validade"
          type="number"
          min={0}
          step={1}
          placeholder="Opcional"
          defaultValue={produto?.dias_validade ?? ""}
          className="rounded border border-zinc-300 px-3 py-2"
        />
        <span className="text-xs text-zinc-500">
          Usado para sugerir a data de validade nas etiquetas. Deixe em branco
          se não se aplicar.
        </span>
      </label>

      <div className="flex flex-col gap-3 rounded border border-zinc-200 bg-zinc-50 p-4">
        <div>
          <p className="text-sm font-medium">Informações para rótulo</p>
          <p className="text-xs text-zinc-500">
            Opcional. Produtos já rotulados de fábrica podem deixar em branco.
          </p>
        </div>
        {!vendidoPorPeso ? (
          <label className="flex flex-col gap-1 text-sm">
            Peso aproximado (g)
            <input
              name="peso_aproximado_g"
              inputMode="decimal"
              placeholder="Ex.: 120"
              defaultValue={produto?.peso_aproximado_g ?? ""}
              className="rounded border border-zinc-300 bg-white px-3 py-2"
            />
            <span className="text-xs text-zinc-500">
              Peso fixo impresso no rótulo. Não se aplica a produtos vendidos
              por peso (R$/kg).
            </span>
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-sm">
          Ingredientes
          <textarea
            name="ingredientes"
            rows={3}
            maxLength={2000}
            placeholder="Carne bovina, sal, alho, pimenta-do-reino, temperos naturais"
            defaultValue={produto?.ingredientes ?? ""}
            className="rounded border border-zinc-300 bg-white px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Contém alergênicos
          <textarea
            name="contem_alergenicos"
            rows={2}
            maxLength={500}
            placeholder="Contém leite e derivados"
            defaultValue={produto?.contem_alergenicos ?? ""}
            className="rounded border border-zinc-300 bg-white px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Pode conter traços de
          <textarea
            name="pode_conter_tracos"
            rows={2}
            maxLength={500}
            placeholder="Pode conter traços de amendoim e castanhas"
            defaultValue={produto?.pode_conter_tracos ?? ""}
            className="rounded border border-zinc-300 bg-white px-3 py-2"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          name="controla_estoque"
          type="checkbox"
          defaultChecked={produto?.controla_estoque ?? true}
        />
        Controla estoque
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          name="permite_venda_pacote"
          type="checkbox"
          checked={permitePacote}
          onChange={(evento) => setPermitePacote(evento.target.checked)}
        />
        Permite venda em pacote
      </label>

      {permitePacote ? (
        <div className="flex flex-col gap-4 rounded border border-zinc-200 bg-zinc-50 p-4">
          <label className="flex flex-col gap-1 text-sm">
            Quantidade por pacote
            <input
              name="quantidade_por_pacote"
              inputMode="decimal"
              placeholder="Ex.: 10"
              value={quantidadePacote}
              onChange={(evento) => setQuantidadePacote(evento.target.value)}
              onFocus={(evento) => evento.target.select()}
              className="rounded border border-zinc-300 bg-white px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Preço do pacote
            <input
              name="preco_pacote"
              inputMode="decimal"
              placeholder="0"
              value={precoPacote}
              onChange={(evento) => setPrecoPacote(evento.target.value)}
              onFocus={(evento) => evento.target.select()}
              className="rounded border border-zinc-300 bg-white px-3 py-2"
            />
          </label>
          {rotuloDesconto ? (
            <p className="text-sm text-zinc-700">{rotuloDesconto}</p>
          ) : null}
        </div>
      ) : null}

      <fieldset className="flex flex-col gap-3 rounded border border-zinc-200 bg-zinc-50 p-4">
        <legend className="px-1 text-sm font-medium">
          Classificação fiscal (NF-e)
        </legend>
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Esses dados devem ser fornecidos pelo contador da empresa.
          Preencher incorretamente pode gerar uma nota fiscal inválida
          ou fiscalmente incorreta.
        </p>

        <label className="flex flex-col gap-1 text-sm">
          NCM
          <input
            name="ncm"
            inputMode="numeric"
            maxLength={10}
            placeholder="00000000"
            defaultValue={produto?.ncm ?? ""}
            className="rounded border border-zinc-300 bg-white px-3 py-2 font-mono"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          CFOP padrão
          <input
            name="cfop_padrao"
            inputMode="numeric"
            maxLength={4}
            placeholder="5102"
            defaultValue={produto?.cfop_padrao ?? ""}
            className="rounded border border-zinc-300 bg-white px-3 py-2 font-mono"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Origem da mercadoria
          <select
            name="origem_mercadoria"
            defaultValue={produto?.origem_mercadoria ?? ""}
            className="rounded border border-zinc-300 bg-white px-3 py-2"
          >
            <option value="">Não informado</option>
            {ORIGENS_MERCADORIA.map((origem) => (
              <option key={origem.valor} value={origem.valor}>
                {origem.rotulo}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          CST/CSOSN
          <input
            name="cst_csosn"
            maxLength={4}
            placeholder="102"
            defaultValue={produto?.cst_csosn ?? ""}
            className="rounded border border-zinc-300 bg-white px-3 py-2 font-mono"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Alíquota ICMS (%)
            <input
              name="aliquota_icms"
              inputMode="decimal"
              placeholder="0"
              defaultValue={produto?.aliquota_icms ?? ""}
              className="rounded border border-zinc-300 bg-white px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Alíquota IPI (%)
            <input
              name="aliquota_ipi"
              inputMode="decimal"
              placeholder="0"
              defaultValue={produto?.aliquota_ipi ?? ""}
              className="rounded border border-zinc-300 bg-white px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Alíquota PIS (%)
            <input
              name="aliquota_pis"
              inputMode="decimal"
              placeholder="0"
              defaultValue={produto?.aliquota_pis ?? ""}
              className="rounded border border-zinc-300 bg-white px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Alíquota COFINS (%)
            <input
              name="aliquota_cofins"
              inputMode="decimal"
              placeholder="0"
              defaultValue={produto?.aliquota_cofins ?? ""}
              className="rounded border border-zinc-300 bg-white px-3 py-2"
            />
          </label>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pendente}
        className="rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
