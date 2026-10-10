export const PERFIS = [
  "super_admin",
  "proprietario",
  "gerente",
  "operador_pdv",
  "financeiro",
  "estoquista",
] as const;

export type Perfil = (typeof PERFIS)[number];

export const PERFIS_ATRIBUIVEIS = [
  "super_admin",
  "proprietario",
  "gerente",
  "operador_pdv",
  "financeiro",
  "estoquista",
] as const;

export type PerfilAtribuivel = (typeof PERFIS_ATRIBUIVEIS)[number];

export const PERFIS_PROPRIETARIO_PODE_GERIR = [
  "gerente",
  "operador_pdv",
  "financeiro",
  "estoquista",
] as const;

export const PERFIS_GERENTE_PODE_GERIR = [
  "operador_pdv",
  "financeiro",
  "estoquista",
] as const;

export const PERFIS_GRADE_PERMISSOES = [
  "gerente",
  "operador_pdv",
  "financeiro",
  "estoquista",
] as const;

const ROTULOS_PERFIL: Record<string, string> = {
  super_admin: "Super admin",
  proprietario: "Proprietário",
  gerente: "Gerente",
  operador_pdv: "Operador PDV",
  financeiro: "Financeiro",
  estoquista: "Estoquista",
};

export function normalizarPerfil(valor: string | null | undefined): Perfil | null {
  const bruto = (valor ?? "").trim().toLowerCase();
  if (bruto === "super_admin") return "super_admin";
  if (bruto === "proprietario") return "proprietario";
  if (bruto === "gerente") return "gerente";
  if (bruto === "operador_pdv" || bruto === "operador" || bruto === "caixa") {
    return "operador_pdv";
  }
  if (bruto === "financeiro") return "financeiro";
  if (bruto === "estoquista") return "estoquista";
  return null;
}

export function rotuloPerfil(valor: string | null | undefined) {
  const perfil = normalizarPerfil(valor) ?? (valor ?? "").trim().toLowerCase();
  return ROTULOS_PERFIL[perfil] ?? valor ?? "—";
}

export function ehPerfilAtribuivel(valor: string): valor is PerfilAtribuivel {
  return (PERFIS_ATRIBUIVEIS as readonly string[]).includes(valor);
}

export function podeAcessarTelaPermissoes(perfil: string | null | undefined) {
  const ator = normalizarPerfil(perfil);
  return ator === "super_admin" || ator === "proprietario";
}

export function podeAcessarAjudaGerenciar(perfil: string | null | undefined) {
  const ator = normalizarPerfil(perfil);
  return (
    ator === "super_admin" || ator === "proprietario" || ator === "gerente"
  );
}

export function perfilAcessaPermissoes(perfil: string | null | undefined) {
  return podeAcessarTelaPermissoes(perfil);
}

export function mudancaPerdeAcessoPermissoes(
  perfilAtual: string | null | undefined,
  perfilNovo: string | null | undefined,
) {
  return (
    perfilAcessaPermissoes(perfilAtual) && !perfilAcessaPermissoes(perfilNovo)
  );
}

export function perfisQuePodeAtribuir(
  perfilLogado: string | null | undefined,
): PerfilAtribuivel[] {
  const perfil = normalizarPerfil(perfilLogado);
  if (perfil === "super_admin") {
    return [...PERFIS_ATRIBUIVEIS];
  }
  if (perfil === "proprietario") {
    return [...PERFIS_PROPRIETARIO_PODE_GERIR];
  }
  if (perfil === "gerente") {
    return [...PERFIS_GERENTE_PODE_GERIR];
  }
  return [];
}

export function podeAtribuirPerfil(
  perfilLogado: string | null | undefined,
  perfilAlvo: string | null | undefined,
) {
  const alvo = (perfilAlvo ?? "").trim().toLowerCase();
  return perfisQuePodeAtribuir(perfilLogado).includes(
    alvo as (typeof PERFIS_ATRIBUIVEIS)[number],
  );
}

export function podeGerenciarUsuario(
  perfilLogado: string | null | undefined,
  perfilAlvo: string | null | undefined,
) {
  const ator = normalizarPerfil(perfilLogado);
  const alvo = (perfilAlvo ?? "").trim().toLowerCase();
  if (ator === "super_admin") return true;
  if (ator === "proprietario") {
    return (PERFIS_PROPRIETARIO_PODE_GERIR as readonly string[]).includes(alvo);
  }
  if (ator === "gerente") {
    return (PERFIS_GERENTE_PODE_GERIR as readonly string[]).includes(alvo);
  }
  return false;
}

export function podeConfigurarPermissoesIndividuais(
  perfilLogado: string | null | undefined,
  perfilAlvo: string | null | undefined,
) {
  const ator = normalizarPerfil(perfilLogado);
  if (ator === "super_admin") {
    return podeGerenciarUsuario(perfilLogado, perfilAlvo);
  }
  if (ator === "proprietario" || ator === "gerente") {
    return podeGerenciarUsuario(perfilLogado, perfilAlvo);
  }
  return false;
}

export function podeSalvarPermissaoPerfil(params: {
  ator: string | null | undefined;
  perfilAlvo: string | null | undefined;
  somenteSuperAdmin: boolean;
}) {
  if (!podeAcessarTelaPermissoes(params.ator)) return false;
  if (params.somenteSuperAdmin) return false;
  const alvo = (params.perfilAlvo ?? "").trim().toLowerCase();
  return (PERFIS_GRADE_PERMISSOES as readonly string[]).includes(alvo);
}

export function podeSalvarPermissaoUsuario(params: {
  ator: string | null | undefined;
  atorId: number;
  alvoId: number;
  alvoPerfil: string | null | undefined;
  somenteSuperAdmin: boolean;
}) {
  if (params.alvoId === params.atorId) return false;
  const ator = normalizarPerfil(params.ator);
  const alvo = (params.alvoPerfil ?? "").trim().toLowerCase();
  if (alvo === "super_admin" && ator !== "super_admin") return false;
  if (!podeConfigurarPermissoesIndividuais(params.ator, params.alvoPerfil)) {
    return false;
  }
  if (params.somenteSuperAdmin && ator !== "super_admin") return false;
  return true;
}

export function rotaPublica(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/painel" ||
    pathname.startsWith("/painel/") ||
    pathname.startsWith("/pedidos/publico") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/keepalive" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  );
}
