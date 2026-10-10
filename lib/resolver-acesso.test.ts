import { describe, expect, it } from "vitest";
import { resolverAcesso } from "@/lib/resolver-acesso";

describe("resolverAcesso", () => {
  it("módulo só super_admin ignora exceção e perfil", () => {
    expect(
      resolverAcesso({
        perfil: "gerente",
        somenteSuperAdmin: true,
        excecao: true,
        perfilPode: true,
      }),
    ).toBe(false);
    expect(
      resolverAcesso({
        perfil: "super_admin",
        somenteSuperAdmin: true,
        excecao: false,
        perfilPode: false,
      }),
    ).toBe(true);
  });

  it("exceção do usuário prevalece sobre o perfil", () => {
    expect(
      resolverAcesso({
        perfil: "gerente",
        somenteSuperAdmin: false,
        excecao: false,
        perfilPode: true,
      }),
    ).toBe(false);
    expect(
      resolverAcesso({
        perfil: "operador",
        somenteSuperAdmin: false,
        excecao: true,
        perfilPode: false,
      }),
    ).toBe(true);
  });

  it("sem exceção usa a permissão do perfil", () => {
    expect(
      resolverAcesso({
        perfil: "gerente",
        somenteSuperAdmin: false,
        excecao: undefined,
        perfilPode: true,
      }),
    ).toBe(true);
    expect(
      resolverAcesso({
        perfil: "operador",
        somenteSuperAdmin: false,
        excecao: undefined,
        perfilPode: undefined,
      }),
    ).toBe(false);
  });
});
