import { describe, expect, it } from "vitest";
import {
  documentoPedidoImpressao,
  enderecoPedidoImpressao,
  formatoImpressaoDaUrl,
  nomeClientePedidoImpressao,
  telefonePedidoImpressao,
  textoOuNaoInformado,
} from "./pedido-impressao";

describe("textoOuNaoInformado", () => {
  it("usa o texto ou o fallback", () => {
    expect(textoOuNaoInformado(" Rua A ")).toBe("Rua A");
    expect(textoOuNaoInformado("")).toBe("não informado");
    expect(textoOuNaoInformado(null)).toBe("não informado");
  });
});

describe("campos do cliente na impressão", () => {
  it("pedido avulso não quebra", () => {
    expect(nomeClientePedidoImpressao(null)).toBe("Cliente não informado");
    expect(telefonePedidoImpressao(null)).toBe("não informado");
    expect(enderecoPedidoImpressao(null)).toBe("não informado");
    expect(documentoPedidoImpressao(null)).toBeNull();
  });

  it("omite documento se não houver CPF/CNPJ", () => {
    expect(
      documentoPedidoImpressao({
        tipo_pessoa: "fisica",
        cpf: null,
        cnpj: null,
      }),
    ).toBeNull();
  });

  it("formata telefone PF e cai no fallback", () => {
    expect(
      telefonePedidoImpressao({
        tipo_pessoa: "fisica",
        telefone: "31988887777",
      }),
    ).toMatch(/31/);
    expect(
      telefonePedidoImpressao({
        tipo_pessoa: "fisica",
        telefone: null,
      }),
    ).toBe("não informado");
  });
});

describe("formatoImpressaoDaUrl", () => {
  it("default A4", () => {
    expect(formatoImpressaoDaUrl()).toBe("a4");
    expect(formatoImpressaoDaUrl("80mm")).toBe("80mm");
    expect(formatoImpressaoDaUrl("outro")).toBe("a4");
  });
});
