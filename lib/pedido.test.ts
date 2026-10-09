import { describe, expect, it } from "vitest";
import { paginaDaUrl } from "./paginacao";
import {
  hrefListaPedidos,
  motivoCancelarIndisponivel,
  motivoConfirmarEntregaIndisponivel,
  motivoEditarIndisponivel,
  numeroPedidoDaBusca,
  pedidoEditavel,
  podeConfirmarEntregaPedido,
  precisaAvisarEdicaoAposEnvio,
  statusAposEditarPedido,
} from "./pedido";

describe("pedidoEditavel", () => {
  it("permite aberto, enviado e aprovado", () => {
    expect(pedidoEditavel("aberto")).toBe(true);
    expect(pedidoEditavel("enviado")).toBe(true);
    expect(pedidoEditavel("aprovado")).toBe(true);
  });

  it("bloqueia convertido e cancelado", () => {
    expect(pedidoEditavel("convertido")).toBe(false);
    expect(pedidoEditavel("cancelado")).toBe(false);
  });
});

describe("numeroPedidoDaBusca", () => {
  it("aceita número inteiro positivo", () => {
    expect(numeroPedidoDaBusca("42")).toBe(42);
    expect(numeroPedidoDaBusca(" 7 ")).toBe(7);
  });

  it("ignora nome, zero e decimal", () => {
    expect(numeroPedidoDaBusca("Maria")).toBeNull();
    expect(numeroPedidoDaBusca("0")).toBeNull();
    expect(numeroPedidoDaBusca("12.5")).toBeNull();
  });
});

describe("edição após envio", () => {
  it("avisa em enviado e aprovado", () => {
    expect(precisaAvisarEdicaoAposEnvio("enviado")).toBe(true);
    expect(precisaAvisarEdicaoAposEnvio("aprovado")).toBe(true);
    expect(precisaAvisarEdicaoAposEnvio("aberto")).toBe(false);
  });

  it("invalida aprovação sem alterar enviado", () => {
    expect(statusAposEditarPedido("aprovado")).toBe("enviado");
    expect(statusAposEditarPedido("enviado")).toBe("enviado");
    expect(statusAposEditarPedido("aberto")).toBe("aberto");
  });
});

describe("tooltips de ações", () => {
  it("explica por que editar está indisponível", () => {
    expect(motivoEditarIndisponivel("aberto")).toBeNull();
    expect(motivoEditarIndisponivel("convertido")).toMatch(/convertido em venda/);
    expect(motivoEditarIndisponivel("cancelado")).toMatch(/cancelado/);
  });

  it("explica por que cancelar está indisponível", () => {
    expect(motivoCancelarIndisponivel("aberto", true)).toBeNull();
    expect(motivoCancelarIndisponivel("aberto", false)).toMatch(/permissão/);
    expect(motivoCancelarIndisponivel("convertido", true)).toMatch(/virou venda/);
    expect(motivoCancelarIndisponivel("cancelado", true)).toMatch(/já está cancelado/);
  });
});

describe("paginaDaUrl", () => {
  it("default 1 e rejeita inválido", () => {
    expect(paginaDaUrl()).toBe(1);
    expect(paginaDaUrl("0")).toBe(1);
    expect(paginaDaUrl("3")).toBe(3);
  });
});

describe("hrefListaPedidos", () => {
  it("omite página 1 e status todos", () => {
    expect(hrefListaPedidos({ pagina: 1, status: "todos" })).toBe("/pedidos");
    expect(hrefListaPedidos({ q: "Ana", pagina: 2, status: "enviado" })).toBe(
      "/pedidos?q=Ana&status=enviado&pagina=2",
    );
  });
});

describe("confirmação de entrega", () => {
  it("só em aprovado ou convertido", () => {
    expect(podeConfirmarEntregaPedido("aprovado")).toBe(true);
    expect(podeConfirmarEntregaPedido("convertido")).toBe(true);
    expect(podeConfirmarEntregaPedido("enviado")).toBe(false);
    expect(motivoConfirmarEntregaIndisponivel("aprovado", true)).toMatch(
      /já registrada/,
    );
    expect(motivoConfirmarEntregaIndisponivel("aberto", false)).toMatch(
      /aprovado ou convertido/,
    );
  });
});
