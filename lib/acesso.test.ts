import { describe, expect, it } from "vitest";
import {
  mudancaPerdeAcessoPermissoes,
  podeAcessarTelaPermissoes,
  podeAtribuirPerfil,
  podeGerenciarUsuario,
  podeSalvarPermissaoPerfil,
  podeSalvarPermissaoUsuario,
  rotaPublica,
} from "./acesso";

describe("hierarquia proprietario", () => {
  it("proprietario cria gerente, operador, financeiro e estoquista", () => {
    expect(podeAtribuirPerfil("proprietario", "gerente")).toBe(true);
    expect(podeAtribuirPerfil("proprietario", "operador_pdv")).toBe(true);
    expect(podeAtribuirPerfil("proprietario", "financeiro")).toBe(true);
    expect(podeAtribuirPerfil("proprietario", "estoquista")).toBe(true);
    expect(podeGerenciarUsuario("proprietario", "gerente")).toBe(true);
    expect(podeGerenciarUsuario("proprietario", "operador_pdv")).toBe(true);
    expect(podeGerenciarUsuario("proprietario", "financeiro")).toBe(true);
    expect(podeGerenciarUsuario("proprietario", "estoquista")).toBe(true);
  });

  it("proprietario não cria nem edita proprietario ou super_admin", () => {
    expect(podeAtribuirPerfil("proprietario", "proprietario")).toBe(false);
    expect(podeAtribuirPerfil("proprietario", "super_admin")).toBe(false);
    expect(podeGerenciarUsuario("proprietario", "proprietario")).toBe(false);
    expect(podeGerenciarUsuario("proprietario", "super_admin")).toBe(false);
  });

  it("proprietario não concede módulo somente_super_admin", () => {
    expect(
      podeSalvarPermissaoPerfil({
        ator: "proprietario",
        perfilAlvo: "gerente",
        somenteSuperAdmin: true,
      }),
    ).toBe(false);
    expect(
      podeSalvarPermissaoUsuario({
        ator: "proprietario",
        atorId: 10,
        alvoId: 20,
        alvoPerfil: "gerente",
        somenteSuperAdmin: true,
      }),
    ).toBe(false);
  });

  it("proprietario não mexe nas próprias permissões", () => {
    expect(
      podeSalvarPermissaoUsuario({
        ator: "proprietario",
        atorId: 10,
        alvoId: 10,
        alvoPerfil: "proprietario",
        somenteSuperAdmin: false,
      }),
    ).toBe(false);
  });

  it("gerente não abre Permissões", () => {
    expect(podeAcessarTelaPermissoes("gerente")).toBe(false);
    expect(
      podeSalvarPermissaoPerfil({
        ator: "gerente",
        perfilAlvo: "operador_pdv",
        somenteSuperAdmin: false,
      }),
    ).toBe(false);
  });

  it("super_admin aceita criar qualquer perfil e abrir Permissões", () => {
    expect(podeAtribuirPerfil("super_admin", "proprietario")).toBe(true);
    expect(podeAtribuirPerfil("super_admin", "super_admin")).toBe(true);
    expect(podeGerenciarUsuario("super_admin", "proprietario")).toBe(true);
    expect(podeAcessarTelaPermissoes("super_admin")).toBe(true);
    expect(podeAcessarTelaPermissoes("proprietario")).toBe(true);
    expect(
      podeSalvarPermissaoPerfil({
        ator: "super_admin",
        perfilAlvo: "gerente",
        somenteSuperAdmin: false,
      }),
    ).toBe(true);
  });

  it("keepalive é público no auth; outras APIs não", () => {
    expect(rotaPublica("/api/keepalive")).toBe(true);
    expect(rotaPublica("/api/faq/search")).toBe(false);
    expect(rotaPublica("/api/logo")).toBe(false);
  });

  it("ninguém perde Permissões ao mudar o próprio perfil", () => {
    expect(mudancaPerdeAcessoPermissoes("proprietario", "gerente")).toBe(true);
    expect(mudancaPerdeAcessoPermissoes("super_admin", "proprietario")).toBe(
      false,
    );
    expect(mudancaPerdeAcessoPermissoes("gerente", "operador_pdv")).toBe(false);
  });
});
