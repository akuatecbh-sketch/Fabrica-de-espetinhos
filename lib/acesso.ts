export const PERFIS = [
  "super_admin",
  "gerente",
  "operador_pdv",
  "financeiro",
  "estoquista",
] as const;

export type Perfil = (typeof PERFIS)[number];

export const PERFIS_ATRIBUIVEIS = [
  "super_admin",
  "gerente",
  "operador_pdv",
  "financeiro",
  "estoquista",
] as const;

export type PerfilAtribuivel = (typeof PERFIS_ATRIBUIVEIS)[number];

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
  gerente: "Gerente",
  operador_pdv: "Operador PDV",
  financeiro: "Financeiro",
  estoquista: "Estoquista",
};

export function normalizarPerfil(valor: string | null | undefined): Perfil | null {
  const bruto = (valor ?? "").trim().toLowerCase();
  if (bruto === "super_admin") return "super_admin";
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

export function perfisQuePodeAtribuir(
  perfilLogado: string | null | undefined,
): PerfilAtribuivel[] {
  const perfil = normalizarPerfil(perfilLogado);
  if (perfil === "super_admin") {
    return [...PERFIS_ATRIBUIVEIS];
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
  if (ator === "super_admin") return true;
  if (ator === "gerente") {
    return podeGerenciarUsuario(perfilLogado, perfilAlvo);
  }
  return false;
}

export function rotaPublica(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  );
}
