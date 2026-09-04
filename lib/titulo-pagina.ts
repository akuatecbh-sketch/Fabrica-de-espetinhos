export function tituloDaRota(pathname: string) {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/vendas/hoje")) return "Vendas do dia";
  if (pathname.includes("/cupom")) return "Cupom não fiscal";
  if (pathname.startsWith("/empresa")) return "Empresa";
  if (pathname.startsWith("/produtos")) return "Produtos";
  if (pathname.startsWith("/clientes")) return "Clientes";
  if (pathname.startsWith("/fornecedores")) return "Fornecedores";
  if (pathname.startsWith("/usuarios")) return "Usuários";
  if (pathname.startsWith("/funcionarios")) return "Funcionários";
  if (pathname.startsWith("/minha-conta")) return "Minha conta";
  if (pathname.startsWith("/trocar-senha")) return "Trocar senha";
  if (pathname.startsWith("/compras")) return "Compras";
  if (pathname.startsWith("/estoque")) return "Estoque";
  if (pathname.startsWith("/etiquetas")) return "Etiquetas";
  if (pathname.startsWith("/pdv")) return "PDV";
  if (pathname.startsWith("/caixa")) return "Caixa";
  if (pathname.startsWith("/financeiro")) return "Financeiro";
  if (pathname.startsWith("/permissoes")) return "Permissões";
  if (pathname.startsWith("/ajuda")) return "Perguntas de ajuda";
  if (pathname.startsWith("/acesso-negado")) return "Acesso negado";
  if (pathname.startsWith("/saude")) return "Saúde do sistema";
  return "Gestão";
}
