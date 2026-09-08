export type MapaAcessos = Record<string, boolean>;

const PREFIXOS_MODULO: [string, string][] = [
  ["/notas-fiscais", "vendas"],
  ["/vendas", "vendas"],
  ["/empresa", "empresa"],
  ["/produtos", "produtos"],
  ["/clientes", "clientes"],
  ["/fornecedores", "fornecedores"],
  ["/usuarios", "usuarios"],
  ["/funcionarios", "funcionarios"],
  ["/estoque", "estoque"],
  ["/etiquetas", "etiquetas"],
  ["/compras", "compras"],
  ["/pdv", "pdv"],
  ["/pedidos", "pedidos"],
  ["/caixa", "caixa"],
  ["/financeiro", "financeiro"],
  ["/saude", "saude"],
];

export const CHAVE_POR_HREF: Record<string, string> = {
  "/": "dashboard",
  "/empresa": "empresa",
  "/produtos": "produtos",
  "/clientes": "clientes",
  "/fornecedores": "fornecedores",
  "/usuarios": "usuarios",
  "/funcionarios": "funcionarios",
  "/estoque": "estoque",
  "/etiquetas": "etiquetas",
  "/compras": "compras",
  "/pdv": "pdv",
  "/pedidos": "pedidos",
  "/caixa": "caixa",
  "/vendas/hoje": "vendas",
  "/notas-fiscais": "vendas",
  "/financeiro": "financeiro",
  "/saude": "saude",
};

function rotaLivre(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/minha-conta" ||
    pathname.startsWith("/minha-conta/") ||
    pathname === "/trocar-senha" ||
    pathname.startsWith("/trocar-senha/") ||
    pathname === "/acesso-negado" ||
    pathname.startsWith("/acesso-negado/") ||
    pathname === "/permissoes" ||
    pathname.startsWith("/permissoes/") ||
    pathname === "/ajuda" ||
    pathname.startsWith("/ajuda/") ||
    pathname.startsWith("/api/")
  );
}

export function moduloChaveDaRota(pathname: string): string | null {
  if (rotaLivre(pathname)) return null;
  if (pathname === "/") return "dashboard";
  for (const [prefixo, chave] of PREFIXOS_MODULO) {
    if (pathname === prefixo || pathname.startsWith(`${prefixo}/`)) {
      return chave;
    }
  }
  return null;
}
