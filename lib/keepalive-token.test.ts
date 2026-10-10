import { describe, expect, it } from "vitest";
import { tokenKeepaliveValido } from "@/lib/keepalive-token";

describe("tokenKeepaliveValido", () => {
  it("aceita só o token certo", () => {
    expect(tokenKeepaliveValido("segredo-certo", "segredo-certo")).toBe(true);
    expect(tokenKeepaliveValido("segredo-errado", "segredo-certo")).toBe(false);
    expect(tokenKeepaliveValido("", "segredo-certo")).toBe(false);
    expect(tokenKeepaliveValido(null, "segredo-certo")).toBe(false);
  });

  it("recusa se o esperado estiver vazio", () => {
    expect(tokenKeepaliveValido("qualquer", "")).toBe(false);
    expect(tokenKeepaliveValido("qualquer", undefined)).toBe(false);
  });
});
