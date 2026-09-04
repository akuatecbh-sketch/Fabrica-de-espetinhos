import type { Prisma } from "@/generated/prisma/client";
import { normalizarPerfil } from "@/lib/acesso";

export const NOME_SISTEMA = "Sistema";
export const EMAIL_OCULTO = "—";

export const SELECT_USUARIO_RELACAO = {
  nome: true,
  email: true,
  perfil: true,
} as const;

export type UsuarioRelacao = {
  nome?: string | null;
  email?: string | null;
  perfil?: string | null;
};

export function podeVerSuperAdmin(perfilDeQuemVe: string | null | undefined) {
  return normalizarPerfil(perfilDeQuemVe) === "super_admin";
}

export function ehSuperAdmin(perfil: string | null | undefined) {
  return normalizarPerfil(perfil) === "super_admin";
}

export function superAdminOcultoPara(
  perfilDeQuemVe: string | null | undefined,
  perfilAlvo: string | null | undefined,
) {
  return ehSuperAdmin(perfilAlvo) && !podeVerSuperAdmin(perfilDeQuemVe);
}

export function filtroOcultarSuperAdmin(
  perfilDeQuemVe: string | null | undefined,
): Prisma.usuarioWhereInput {
  if (podeVerSuperAdmin(perfilDeQuemVe)) return {};
  return { perfil: { not: "super_admin" } };
}

export function nomeExibicao(
  usuario: UsuarioRelacao | null | undefined,
  perfilDeQuemVeVe: string | null | undefined,
): { nome: string; email: string } {
  if (!usuario) return { nome: "—", email: "—" };
  if (superAdminOcultoPara(perfilDeQuemVeVe, usuario.perfil)) {
    return { nome: NOME_SISTEMA, email: EMAIL_OCULTO };
  }
  const nome = (usuario.nome ?? "").trim();
  const email = (usuario.email ?? "").trim();
  return {
    nome: nome || "—",
    email: email || "—",
  };
}
