import {
  documentoCliente,
  ehPessoaJuridica,
  nomeExibicaoCliente,
  telefoneWhatsAppCliente,
} from "@/lib/cliente";
import { formatarCnpjCpf, formatarTelefone } from "@/lib/documento";

export const CHAVE_FORMATO_IMPRESSAO = "pedido-impressao-formato";
export const FORMATOS_IMPRESSAO_PEDIDO = ["a4", "80mm"] as const;
export type FormatoImpressaoPedido = (typeof FORMATOS_IMPRESSAO_PEDIDO)[number];

export function ehFormatoImpressaoPedido(
  valor: string | null | undefined,
): valor is FormatoImpressaoPedido {
  return valor === "a4" || valor === "80mm";
}

export function formatoImpressaoDaUrl(valor?: string): FormatoImpressaoPedido {
  return valor === "80mm" ? "80mm" : "a4";
}

export function textoOuNaoInformado(valor: string | null | undefined) {
  const limpo = (valor ?? "").trim();
  return limpo || "não informado";
}

export function documentoPedidoImpressao(cliente: {
  tipo_pessoa?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
} | null) {
  if (!cliente) return null;
  const bruto = documentoCliente(cliente);
  if (!bruto) return null;
  return {
    rotulo: ehPessoaJuridica(cliente.tipo_pessoa) ? "CNPJ" : "CPF",
    valor: formatarCnpjCpf(bruto),
  };
}

export function telefonePedidoImpressao(cliente: {
  tipo_pessoa?: string | null;
  telefone?: string | null;
  contato_telefone?: string | null;
} | null) {
  if (!cliente) return "não informado";
  const digitos = telefoneWhatsAppCliente(cliente);
  if (!digitos) return "não informado";
  return formatarTelefone(digitos);
}

export function enderecoPedidoImpressao(endereco: string | null | undefined) {
  return textoOuNaoInformado(endereco);
}

export function nomeClientePedidoImpressao(
  cliente: {
    tipo_pessoa?: string | null;
    nome: string;
    razao_social?: string | null;
    nome_fantasia?: string | null;
  } | null,
) {
  if (!cliente) return "Cliente não informado";
  return nomeExibicaoCliente(cliente);
}

export type ItemPedidoImpressao = {
  id: number;
  nome: string;
  quantidade: string;
  precoUnitario: string;
  subtotal: string;
  observacao: string | null;
};

export type PedidoImpressaoDados = {
  numero: number;
  data: Date;
  observacao: string | null;
  total: { toString(): string };
  subtotal: { toString(): string };
  desconto: { toString(): string };
  clienteNome: string;
  clienteTelefone: string;
  clienteEndereco: string;
  clienteDocumento: { rotulo: string; valor: string } | null;
  itens: ItemPedidoImpressao[];
  entregueEm: Date | null;
  recebidoPorNome: string | null;
};
