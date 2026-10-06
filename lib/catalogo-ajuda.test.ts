import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CATALOGO_AJUDA,
  rotasDoItemCatalogo,
} from "../lib/catalogo-ajuda";
import { filtrarItensAjuda } from "../lib/catalogo-busca";
import { CHAVE_POR_HREF } from "../lib/permissoes-rotas";

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

type CasoConsulta = {
  consulta: string;
  esperada: string | null;
};

const ACESSOS_OPERADOR: Record<string, boolean> = {
  dashboard: true,
  pdv: true,
  caixa: true,
  vendas: true,
  pedidos: true,
};

const ACESSOS_GERENTE: Record<string, boolean> = {
  dashboard: true,
  produtos: true,
  clientes: true,
  fornecedores: true,
  usuarios: true,
  funcionarios: true,
  estoque: true,
  compras: true,
  pdv: true,
  caixa: true,
  vendas: true,
  financeiro: true,
  empresa: true,
  auditoria: true,
  relatorios: true,
  producao: true,
  cancelar_producao: true,
  etiquetas: true,
  pedidos: true,
  cancelar_venda: true,
};

function acessosTotais() {
  const mapa: Record<string, boolean> = { ...ACESSOS_GERENTE };
  mapa.saude = true;
  return mapa;
}

function rotasDoCatalogo() {
  const rotas = new Set<string>();
  for (const item of CATALOGO_AJUDA) {
    for (const rota of rotasDoItemCatalogo(item)) rotas.add(rota);
  }
  return rotas;
}

function hrefsDoMenu() {
  const arquivo = path.join(RAIZ, "app", "(backoffice)", "sidebar.tsx");
  const texto = readFileSync(arquivo, "utf8");
  const encontrados = new Set<string>();
  for (const match of texto.matchAll(/href: "(\/[^"]*)"/g)) {
    encontrados.add(match[1]);
  }
  for (const match of texto.matchAll(/href="(\/[^"]*)"/g)) {
    encontrados.add(match[1]);
  }
  encontrados.add("/");
  encontrados.add("/minha-conta");
  return [...encontrados];
}

function rotaDePage(arquivo: string) {
  let relativo = arquivo.replace(/\\/g, "/");
  if (!relativo.startsWith("app/")) return null;
  relativo = relativo.slice("app/".length).replace(/\/page\.tsx$/, "");
  relativo = relativo.replace(/^\(backoffice\)\/?/, "");
  if (relativo.includes("[")) return null;
  if (relativo === "login" || relativo.startsWith("login/")) return null;
  if (relativo === "acesso-negado" || relativo.startsWith("acesso-negado/")) {
    return null;
  }
  if (relativo.startsWith("pedidos/publico")) return null;
  if (!relativo) return "/";
  return `/${relativo}`;
}

function listarPageTsx(diretorio: string, acc: string[] = []) {
  for (const entrada of readdirSync(diretorio, { withFileTypes: true })) {
    const cheio = path.join(diretorio, entrada.name);
    if (entrada.isDirectory()) {
      listarPageTsx(cheio, acc);
    } else if (entrada.name === "page.tsx") {
      acc.push(path.relative(RAIZ, cheio).replace(/\\/g, "/"));
    }
  }
  return acc;
}

function paginasEstaticas() {
  return listarPageTsx(path.join(RAIZ, "app"))
    .map((arquivo) => rotaDePage(arquivo))
    .filter((rota): rota is string => rota != null);
}

function chavesNoCatalogo() {
  const chaves = new Set<string>();
  for (const item of CATALOGO_AJUDA) {
    if (item.modulo == null) continue;
    const lista = Array.isArray(item.modulo) ? item.modulo : [item.modulo];
    for (const chave of lista) chaves.add(chave);
    const texto = [
      item.titulo,
      item.descricao,
      ...item.palavrasChave,
      ...item.sinonimos,
    ]
      .join(" ")
      .toLowerCase();
    if (texto.includes("cancelar producao") || texto.includes("cancelar produção")) {
      chaves.add("cancelar_producao");
    }
    if (texto.includes("cancelar venda")) chaves.add("cancelar_venda");
  }
  return chaves;
}

function primeiraRota(
  consulta: string,
  acessos: Record<string, boolean> = acessosTotais(),
  perfil = "super_admin",
) {
  return (
    filtrarItensAjuda(CATALOGO_AJUDA, consulta, acessos, perfil)[0]?.rota ?? null
  );
}

function rotasEncontradas(
  consulta: string,
  acessos: Record<string, boolean>,
  perfil: string,
) {
  return filtrarItensAjuda(CATALOGO_AJUDA, consulta, acessos, perfil).map(
    (item) => item.rota,
  );
}

function avaliar(casos: CasoConsulta[], acessos = acessosTotais(), perfil = "super_admin") {
  return casos.map((caso) => {
    const encontrada = primeiraRota(caso.consulta, acessos, perfil);
    const ok = encontrada === caso.esperada;
    return {
      consulta: caso.consulta,
      encontrada: encontrada ?? "—",
      esperada: caso.esperada ?? "—",
      resultado: ok ? "ok" : "falhou",
      ok,
    };
  });
}

function tabelaConsultas(
  linhas: ReturnType<typeof avaliar>,
) {
  const colConsulta = Math.max(
    8,
    ...linhas.map((linha) => linha.consulta.length),
  );
  const colEncontrada = Math.max(
    14,
    ...linhas.map((linha) => linha.encontrada.length),
  );
  const colEsperada = Math.max(
    8,
    ...linhas.map((linha) => linha.esperada.length),
  );
  const cabecalho = `${"consulta".padEnd(colConsulta)}  ${"rota encontrada".padEnd(colEncontrada)}  ${"esperada".padEnd(colEsperada)}  ok/falhou`;
  const corpo = linhas.map(
    (linha) =>
      `${linha.consulta.padEnd(colConsulta)}  ${linha.encontrada.padEnd(colEncontrada)}  ${linha.esperada.padEnd(colEsperada)}  ${linha.resultado}`,
  );
  const ok = linhas.filter((linha) => linha.ok).length;
  return [
    cabecalho,
    "-".repeat(cabecalho.length),
    ...corpo,
    "",
    `${ok}/${linhas.length} ok`,
  ].join("\n");
}

/** 66 consultas da investigação do Ctrl+K. fiado e sangria não têm tela. */
export const CONSULTAS_INVESTIGACAO: CasoConsulta[] = [
  { consulta: "cadastrar cliente", esperada: "/clientes/novo" },
  { consulta: "novo cliente", esperada: "/clientes/novo" },
  { consulta: "cancelar venda", esperada: "/vendas/hoje" },
  { consulta: "taxa de cartão", esperada: "/financeiro?aba=taxas" },
  { consulta: "taxa cartao", esperada: "/financeiro?aba=taxas" },
  { consulta: "pix", esperada: "/empresa" },
  { consulta: "etiqueta", esperada: "/etiquetas" },
  { consulta: "etiquetas", esperada: "/etiquetas" },
  { consulta: "férias", esperada: "/funcionarios" },
  { consulta: "ferias", esperada: "/funcionarios" },
  { consulta: "inventário", esperada: "/relatorios/inventario" },
  { consulta: "inventario", esperada: "/relatorios/inventario" },
  { consulta: "frete", esperada: "/pdv" },
  { consulta: "desconto", esperada: "/pdv" },
  { consulta: "nota fiscal", esperada: "/notas-fiscais" },
  { consulta: "nfc-e", esperada: "/notas-fiscais" },
  { consulta: "nfce", esperada: "/notas-fiscais" },
  { consulta: "nfe", esperada: "/notas-fiscais" },
  { consulta: "backup", esperada: "/saude?aba=backups" },
  { consulta: "senha", esperada: "/minha-conta" },
  { consulta: "painel tv", esperada: "/painel" },
  { consulta: "painel", esperada: "/painel" },
  { consulta: "comissão", esperada: "/relatorios/comissoes" },
  { consulta: "comissao", esperada: "/relatorios/comissoes" },
  { consulta: "produção", esperada: "/producao" },
  { consulta: "producao", esperada: "/producao" },
  { consulta: "pdv", esperada: "/pdv" },
  { consulta: "abrir caixa", esperada: "/caixa" },
  { consulta: "fechar caixa", esperada: "/caixa" },
  { consulta: "sangria", esperada: null },
  { consulta: "localizar cliente", esperada: "/pdv" },
  { consulta: "pedido", esperada: "/pedidos" },
  { consulta: "fornecedor", esperada: "/fornecedores" },
  { consulta: "funcionário", esperada: "/funcionarios" },
  { consulta: "funcionario", esperada: "/funcionarios" },
  { consulta: "usuário", esperada: "/usuarios" },
  { consulta: "usuario", esperada: "/usuarios" },
  { consulta: "auditoria", esperada: "/auditoria" },
  { consulta: "permissões", esperada: "/permissoes" },
  { consulta: "permissoes", esperada: "/permissoes" },
  { consulta: "empresa", esperada: "/empresa" },
  { consulta: "logo", esperada: "/empresa" },
  { consulta: "instagram", esperada: "/empresa" },
  { consulta: "cupom", esperada: "/pdv" },
  { consulta: "observação cupom", esperada: "/pdv" },
  { consulta: "fiado", esperada: null },
  { consulta: "conta a pagar", esperada: "/financeiro?aba=despesas" },
  { consulta: "conta a receber", esperada: "/financeiro?aba=receber" },
  { consulta: "dre", esperada: "/financeiro?aba=resumo" },
  { consulta: "faturamento", esperada: "/financeiro?aba=faturamento" },
  { consulta: "estoque", esperada: "/estoque" },
  { consulta: "ajuste de estoque", esperada: "/estoque?aba=ajuste" },
  { consulta: "ficha técnica", esperada: "/produtos" },
  { consulta: "ficha tecnica", esperada: "/produtos" },
  { consulta: "código de barras", esperada: "/etiquetas" },
  { consulta: "codigo de barras", esperada: "/etiquetas" },
  { consulta: "trocar senha", esperada: "/minha-conta" },
  { consulta: "minha conta", esperada: "/minha-conta" },
  { consulta: "vendas do dia", esperada: "/vendas/hoje" },
  { consulta: "relatório", esperada: "/relatorios" },
  { consulta: "relatorio", esperada: "/relatorios" },
  { consulta: "margem", esperada: "/relatorios/margem" },
  { consulta: "produtos mais vendidos", esperada: "/relatorios/produtos-mais-vendidos" },
  { consulta: "saúde", esperada: "/saude" },
  { consulta: "saude", esperada: "/saude" },
  { consulta: "ajuda", esperada: "/ajuda/gerenciar" },
];

export const CONSULTAS_DIGITACAO: CasoConsulta[] = [
  { consulta: "clinte", esperada: "/clientes/novo" },
  { consulta: "invetario", esperada: "/relatorios/inventario" },
  { consulta: "clente", esperada: "/clientes/novo" },
  { consulta: "cadastar cliente", esperada: "/clientes/novo" },
  { consulta: "canclear venda", esperada: "/vendas/hoje" },
  { consulta: "etiquta", esperada: "/etiquetas" },
  { consulta: "produsao", esperada: "/producao" },
  { consulta: "relatorioo", esperada: "/relatorios" },
  { consulta: "usario", esperada: "/usuarios/novo" },
  { consulta: "permisoes", esperada: "/permissoes" },
  { consulta: "comisao", esperada: "/relatorios/comissoes" },
  { consulta: "estqoue", esperada: "/estoque" },
  { consulta: "fonecedor", esperada: "/fornecedores/novo" },
  { consulta: "funcionaro", esperada: "/funcionarios/novo" },
  { consulta: "caiza", esperada: "/caixa" },
  { consulta: "emprsa", esperada: "/empresa" },
  { consulta: "pedidio", esperada: "/pedidos/novo" },
  { consulta: "ferais", esperada: "/funcionarios" },
  { consulta: "faturameto", esperada: "/financeiro?aba=faturamento" },
  { consulta: "nfcee", esperada: "/notas-fiscais" },
];

const CONSULTAS_REAIS = [...CONSULTAS_INVESTIGACAO, ...CONSULTAS_DIGITACAO];

describe("catálogo da busca Ctrl+K", () => {
  it("tem um item para cada atalho do menu lateral", () => {
    const rotas = rotasDoCatalogo();
    const faltando = hrefsDoMenu().filter((href) => !rotas.has(href));
    expect(faltando).toEqual([]);
  });

  it("tem um item para cada página estática do app", () => {
    const rotas = rotasDoCatalogo();
    const faltando = paginasEstaticas().filter((rota) => !rotas.has(rota));
    expect(faltando).toEqual([]);
  });

  it("cobre todas as chaves de módulo", () => {
    const esperadas = new Set<string>([
      ...Object.values(CHAVE_POR_HREF),
      "cancelar_producao",
      "cancelar_venda",
    ]);
    const cobertas = chavesNoCatalogo();
    const faltando = [...esperadas].filter((chave) => !cobertas.has(chave));
    expect(faltando).toEqual([]);
  });

  it("o arquivo do catálogo existe no repositório", () => {
    expect(existsSync(path.join(RAIZ, "lib", "catalogo-ajuda.ts"))).toBe(true);
  });
});

describe("consultas reais da investigação", () => {
  it("tem as 66 consultas da investigação e 20 com erro de digitação", () => {
    expect(CONSULTAS_INVESTIGACAO).toHaveLength(66);
    expect(CONSULTAS_DIGITACAO).toHaveLength(20);
  });

  it("consulta → rota encontrada → esperada (meta 100%)", () => {
    const linhas = avaliar(CONSULTAS_REAIS);
    const texto = tabelaConsultas(linhas);
    console.log(`\n${texto}\n`);
    const falhas = linhas.filter((linha) => !linha.ok);
    expect(falhas, texto).toEqual([]);
  });
});

describe("busca do catálogo por perfil", () => {
  it("operador_pdv não acha permissões, usuários, financeiro, auditoria, saúde nem painel de TV", () => {
    const bloqueadas = [
      { consulta: "permissoes", rota: "/permissoes" },
      { consulta: "usuario", rota: "/usuarios" },
      { consulta: "financeiro", rota: "/financeiro" },
      { consulta: "auditoria", rota: "/auditoria" },
      { consulta: "saude", rota: "/saude" },
      { consulta: "painel tv", rota: "/painel" },
    ];
    const vazou = bloqueadas.filter((caso) =>
      rotasEncontradas(caso.consulta, ACESSOS_OPERADOR, "operador_pdv").some(
        (rota) => rota === caso.rota || rota.startsWith(`${caso.rota}?`),
      ),
    );
    expect(vazou).toEqual([]);
  });

  it("gerente acha tudo menos saúde", () => {
    const linhas = avaliar(
      CONSULTAS_REAIS.filter((caso) => caso.esperada != null),
      ACESSOS_GERENTE,
      "gerente",
    ).map((linha) => {
      const saude = linha.esperada.startsWith("/saude");
      const permissoes = linha.esperada === "/permissoes";
      if (saude) {
        const ok = linha.encontrada === "—";
        return { ...linha, ok, resultado: ok ? "ok" : "falhou" };
      }
      if (permissoes) {
        const ok = linha.encontrada !== "/permissoes";
        return { ...linha, ok, resultado: ok ? "ok" : "falhou" };
      }
      return linha;
    });
    const rotasPermissoes = rotasEncontradas(
      "permissoes",
      ACESSOS_GERENTE,
      "gerente",
    );
    expect(rotasPermissoes.includes("/permissoes")).toBe(false);
    const falhas = linhas.filter((linha) => !linha.ok);
    expect(falhas, tabelaConsultas(linhas)).toEqual([]);
  });

  it("proprietario acha tudo menos saúde, inclusive permissões", () => {
    const linhas = avaliar(
      CONSULTAS_REAIS.filter((caso) => caso.esperada != null),
      ACESSOS_GERENTE,
      "proprietario",
    ).map((linha) => {
      if (linha.esperada.startsWith("/saude")) {
        const ok = linha.encontrada === "—";
        return { ...linha, ok, resultado: ok ? "ok" : "falhou" };
      }
      return linha;
    });
    const rotasPermissoes = rotasEncontradas(
      "permissoes",
      ACESSOS_GERENTE,
      "proprietario",
    );
    expect(rotasPermissoes.includes("/permissoes")).toBe(true);
    const falhas = linhas.filter((linha) => !linha.ok);
    expect(falhas, tabelaConsultas(linhas)).toEqual([]);
  });

  it("super_admin acha tudo", () => {
    const linhas = avaliar(CONSULTAS_REAIS.filter((caso) => caso.esperada != null));
    const falhas = linhas.filter((linha) => !linha.ok);
    expect(falhas, tabelaConsultas(linhas)).toEqual([]);
  });
});
