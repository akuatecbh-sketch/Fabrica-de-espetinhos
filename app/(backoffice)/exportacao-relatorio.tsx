"use client";

export function slugArquivo(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-de-/g, "-");
}

function celulaCsv(valor: string) {
  if (/[;"\n\r]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

export function baixarCsv(nomeArquivo: string, linhas: string[][]) {
  const corpo = linhas.map((linha) => linha.map(celulaCsv).join(";")).join("\r\n");
  const blob = new Blob([`\uFEFF${corpo}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo.endsWith(".csv")
    ? nomeArquivo
    : `${nomeArquivo}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function BotoesExportacao({
  onExportarCsv,
}: {
  onExportarCsv: () => void;
}) {
  return (
    <div className="print-ocultar flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onExportarCsv}
        className="min-h-11 rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        Exportar CSV
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="min-h-11 rounded bg-gradiente-brasa px-4 py-2 text-sm font-medium text-white"
      >
        Imprimir / Salvar PDF
      </button>
    </div>
  );
}

export function FolhaRelatorio({
  titulo,
  subtitulo,
  colunas,
  linhas,
}: {
  titulo: string;
  subtitulo?: string;
  colunas: string[];
  linhas: string[][];
}) {
  return (
    <section className="print-apenas inventario-folha">
      <header className="inventario-folha-cabecalho">
        <h1>{titulo}</h1>
        {subtitulo ? <p>{subtitulo}</p> : null}
      </header>
      <table>
        <thead>
          <tr>
            {colunas.map((coluna) => (
              <th key={coluna}>{coluna}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, indice) => (
            <tr key={`${indice}-${linha[0] ?? ""}`}>
              {linha.map((celula, coluna) => (
                <td
                  key={`${indice}-${coluna}`}
                  className={coluna > 0 ? "inventario-folha-numero" : undefined}
                >
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
