export const TIPO_PESSOA_FISICA = "fisica";
export const TIPO_PESSOA_JURIDICA = "juridica";

export type TipoPessoaCliente =
  | typeof TIPO_PESSOA_FISICA
  | typeof TIPO_PESSOA_JURIDICA;

export function ehPessoaJuridica(tipo: string | null | undefined) {
  return tipo === TIPO_PESSOA_JURIDICA;
}

export function nomeExibicaoCliente(cliente: {
  tipo_pessoa?: string | null;
  nome: string;
  razao_social?: string | null;
  nome_fantasia?: string | null;
}) {
  if (ehPessoaJuridica(cliente.tipo_pessoa)) {
    const fantasia = cliente.nome_fantasia?.trim();
    if (fantasia) return fantasia;
    const razao = cliente.razao_social?.trim();
    if (razao) return razao;
  }
  return cliente.nome;
}

export function documentoCliente(cliente: {
  tipo_pessoa?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
}) {
  return ehPessoaJuridica(cliente.tipo_pessoa)
    ? (cliente.cnpj ?? null)
    : (cliente.cpf ?? null);
}
