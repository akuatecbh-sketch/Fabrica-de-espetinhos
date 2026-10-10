import { describe, expect, it, vi } from "vitest";
import { dispararKeepalive } from "@/lib/keepalive-cliente";

describe("dispararKeepalive", () => {
  it("não chama o site se faltar URL ou token", async () => {
    const fetchImpl = vi.fn();
    const semToken = await dispararKeepalive({
      url: "https://exemplo.netlify.app",
      fetchImpl,
    });
    const semUrl = await dispararKeepalive({
      token: "abc",
      fetchImpl,
    });
    expect(semToken).toEqual({ ok: true, pulou: "config" });
    expect(semUrl).toEqual({ ok: true, pulou: "config" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("não chama o site fora da janela (domingo)", async () => {
    const fetchImpl = vi.fn();
    const domingo = new Date(Date.UTC(2026, 0, 11, 15, 0, 0));
    const resultado = await dispararKeepalive({
      url: "https://exemplo.netlify.app",
      token: "abc",
      agora: domingo,
      fetchImpl,
    });
    expect(resultado).toEqual({ ok: true, pulou: "fora-da-janela" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("chama /api/keepalive com o cabeçalho na janela", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const abertura = new Date(Date.UTC(2026, 0, 5, 10, 56, 0));
    const resultado = await dispararKeepalive({
      url: "https://exemplo.netlify.app/",
      token: "abc",
      agora: abertura,
      fetchImpl,
    });
    expect(resultado).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://exemplo.netlify.app/api/keepalive",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "x-keepalive-token": "abc" }),
      }),
    );
  });
});
