"use client";

import {
  avisoRotuloCompacto,
  ehFolhaA4,
  etiquetaComportaRotuloCompleto,
  etiquetasPorFolha,
  formatarDataIso,
  formatarPesoKg,
  type EtiquetaPreview,
} from "@/lib/etiquetas";
import { formatarPreco } from "@/lib/format";
import { CodigoBarrasEan13 } from "./codigo-barras";

export type { EtiquetaPreview };

function nomeEmpresa(preview: EtiquetaPreview) {
  const empresa = preview.empresa;
  if (!empresa) return null;
  return empresa.nomeFantasia?.trim() || empresa.razaoSocial;
}

function formatarPesoAprox(valor: string | null) {
  if (!valor) return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  const texto = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(numero);
  return `Peso aprox. ${texto} g`;
}

function CabecalhoEmpresa({
  preview,
  compacto,
}: {
  preview: EtiquetaPreview;
  compacto: boolean;
}) {
  const nome = nomeEmpresa(preview);
  const logo = preview.empresa?.logoUrl;
  if (!nome && !logo) return null;

  return (
    <div
      className={`flex min-w-0 items-center ${compacto ? "gap-0.5" : "gap-1"}`}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          className="shrink-0 object-contain"
          style={{
            maxHeight: compacto ? "6mm" : "18mm",
            maxWidth: compacto ? "10mm" : "20mm",
          }}
        />
      ) : null}
      {nome ? (
        <p
          className={
            compacto
              ? "min-w-0 truncate text-[6px] font-medium leading-tight text-texto-primario"
              : "min-w-0 line-clamp-2 text-[7.5px] font-semibold leading-tight text-texto-primario"
          }
        >
          {nome}
        </p>
      ) : null}
    </div>
  );
}

function BlocoEssencial({
  preview,
  compacto,
}: {
  preview: EtiquetaPreview;
  compacto: boolean;
}) {
  const preco = formatarPreco(preview.precoCalculado);
  const fabricacao = formatarDataIso(preview.fabricacaoIso);
  const acondicionamento = formatarDataIso(preview.acondicionamentoIso);
  const validade = preview.validadeIso
    ? formatarDataIso(preview.validadeIso)
    : null;
  const nomeClasse = compacto
    ? "truncate text-[8px] font-semibold leading-tight text-texto-primario"
    : "line-clamp-2 text-[8.5px] font-semibold leading-tight text-texto-primario";
  const infoClasse = compacto
    ? "flex flex-wrap gap-x-2 gap-y-px text-[7px] leading-tight text-texto-primario"
    : "flex flex-col gap-px text-[7.5px] leading-tight text-texto-primario";

  return (
    <>
      <p className={nomeClasse}>{preview.produto.nome}</p>
      <CodigoBarrasEan13
        valor={preview.produto.codigo_barras}
        altura={compacto ? 11 : 13}
      />
      <div className={infoClasse}>
        {preview.vendidoPorPeso ? (
          <>
            <p>Preço/kg: {formatarPreco(preview.precoPorKg)}</p>
            <p>Peso: {formatarPesoKg(preview.pesoKg)}</p>
            <p className="font-data font-semibold">Preço: {preco}</p>
          </>
        ) : (
          <p className="font-data font-semibold">{preco}</p>
        )}
        <p>Lote {preview.lote}</p>
        <p>Fab. {fabricacao}</p>
        <p>Acond. {acondicionamento}</p>
        {validade ? <p>Val. {validade}</p> : null}
      </div>
    </>
  );
}

function BlocoRotuloExtra({ preview }: { preview: EtiquetaPreview }) {
  const peso = formatarPesoAprox(preview.produto.pesoAproximadoG);
  const { ingredientes, contemAlergenicos, podeConterTracos } = preview.produto;
  if (!peso && !ingredientes && !contemAlergenicos && !podeConterTracos) {
    return null;
  }

  return (
    <div className="min-w-0 overflow-hidden text-[6.5px] leading-[1.15] text-texto-primario">
      {peso ? <p className="font-medium">{peso}</p> : null}
      {ingredientes ? (
        <p className="line-clamp-4">Ingredientes: {ingredientes}</p>
      ) : null}
      {contemAlergenicos ? (
        <p className="line-clamp-2 font-medium">{contemAlergenicos}</p>
      ) : null}
      {podeConterTracos ? (
        <p className="line-clamp-2">{podeConterTracos}</p>
      ) : null}
    </div>
  );
}

function ConteudoEtiqueta({ preview }: { preview: EtiquetaPreview }) {
  const completo = etiquetaComportaRotuloCompleto(preview.modelo);
  const extra = completo ? <BlocoRotuloExtra preview={preview} /> : null;

  if (completo && preview.modelo.largura_mm >= 90) {
    return (
      <div className="flex h-full min-h-0 gap-1">
        <div className="flex w-[22mm] shrink-0 flex-col justify-center">
          <CabecalhoEmpresa preview={preview} compacto={false} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between overflow-hidden">
          <BlocoEssencial preview={preview} compacto={false} />
        </div>
        {extra ? (
          <div className="w-[36mm] shrink-0 overflow-hidden border-l border-borda/60 pl-1">
            {extra}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <CabecalhoEmpresa preview={preview} compacto={!completo} />
      <BlocoEssencial preview={preview} compacto={!completo} />
      {extra}
    </>
  );
}

function EtiquetaArtigo({
  preview,
  indice,
}: {
  preview: EtiquetaPreview;
  indice: number;
}) {
  const { modelo } = preview;
  const compacta = !etiquetaComportaRotuloCompleto(modelo);
  return (
    <article
      key={indice}
      className={`etiqueta-item flex flex-col justify-between overflow-hidden rounded border border-borda bg-superficie ${
        compacta ? "p-px" : "p-0.5"
      }`}
      style={{
        width: `${modelo.largura_mm}mm`,
        height: `${modelo.altura_mm}mm`,
      }}
    >
      <ConteudoEtiqueta preview={preview} />
    </article>
  );
}

function PreviewRolo({ preview }: { preview: EtiquetaPreview }) {
  const itens = Array.from({ length: preview.quantidade }, (_, i) => i);
  return (
    <div className="etiquetas-rolo etiquetas-grade flex flex-wrap gap-3 print:block print:gap-0">
      {itens.map((indice) => (
        <EtiquetaArtigo key={indice} preview={preview} indice={indice} />
      ))}
    </div>
  );
}

function PreviewA4({ preview }: { preview: EtiquetaPreview }) {
  const { modelo } = preview;
  const porFolha = etiquetasPorFolha(modelo);
  const totalPaginas = Math.ceil(preview.quantidade / porFolha);

  return (
    <div className="etiquetas-a4 flex flex-col gap-6 print:gap-0">
      {Array.from({ length: totalPaginas }, (_, pagina) => {
        const inicio = pagina * porFolha;
        const nestaFolha = Math.min(porFolha, preview.quantidade - inicio);
        return (
          <div
            key={pagina}
            className="etiquetas-a4-pagina border border-dashed border-borda bg-superficie print:border-0"
            style={{
              width: "210mm",
              height: "297mm",
              paddingTop: `${modelo.margem_superior_mm}mm`,
              paddingLeft: `${modelo.margem_esquerda_mm}mm`,
              display: "grid",
              gridTemplateColumns: `repeat(${modelo.colunas_por_folha}, ${modelo.largura_mm}mm)`,
              gridAutoRows: `${modelo.altura_mm}mm`,
              columnGap: `${modelo.espaco_horizontal_mm}mm`,
              rowGap: `${modelo.espaco_vertical_mm}mm`,
            }}
          >
            {Array.from({ length: nestaFolha }, (_, i) => (
              <EtiquetaArtigo
                key={`${pagina}-${i}`}
                preview={preview}
                indice={inicio + i}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function EtiquetasPreview({ preview }: { preview: EtiquetaPreview }) {
  const folha = ehFolhaA4(preview.modelo);
  const tamanhoPagina = folha
    ? "A4"
    : `${preview.modelo.largura_mm}mm ${preview.modelo.altura_mm}mm`;
  const aviso = avisoRotuloCompacto(preview.modelo, {
    pesoAproximadoG: preview.produto.pesoAproximadoG,
    ingredientes: preview.produto.ingredientes,
    contemAlergenicos: preview.produto.contemAlergenicos,
    podeConterTracos: preview.produto.podeConterTracos,
  });

  return (
    <section className="flex flex-col gap-4">
      <style>{`@media print { @page { size: ${tamanhoPagina}; margin: 0; } }`}</style>
      <div className="print-ocultar flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Prévia</h2>
          <p className="text-sm text-texto-secundario">
            {`${preview.quantidade} ${preview.quantidade === 1 ? "etiqueta" : "etiquetas"} · lote ${preview.lote} · ${preview.modelo.nome}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-11 rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
        >
          Imprimir
        </button>
      </div>
      {aviso ? (
        <p className="print-ocultar rounded border border-borda bg-fundo px-3 py-2 text-sm text-texto-secundario">
          {aviso}
        </p>
      ) : null}

      <div className="print:overflow-visible overflow-x-auto">
        {folha ? (
          <PreviewA4 preview={preview} />
        ) : (
          <PreviewRolo preview={preview} />
        )}
      </div>
    </section>
  );
}
