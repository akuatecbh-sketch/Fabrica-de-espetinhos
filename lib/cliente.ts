export const TIPO_PESSOA_FISICA = "fisica";
export const TIPO_PESSOA_JURIDICA = "juridica";

export type TipoPessoaCliente =
  | typeof TIPO_PESSOA_FISICA
  | typeof TIPO_PESSOA_JURIDICA;

export const CATEGORIAS_PRECO = ["varejo", "atacado", "repasse"] as const;

export type CategoriaPreco = (typeof CATEGORIAS_PRECO)[number];

export const CATEGORIA_PRECO_PADRAO: CategoriaPreco = "varejo";

const ROTULOS_CATEGORIA_PRECO: Record<CategoriaPreco, string> = {
  varejo: "Varejo",
  atacado: "Atacado",
  repasse: "Repasse",
};

export function ehCategoriaPreco(valor: string): valor is CategoriaPreco {
  return (CATEGORIAS_PRECO as readonly string[]).includes(valor);
}

export function rotuloCategoriaPreco(valor: string | null | undefined) {
  if (valor && ehCategoriaPreco(valor)) return ROTULOS_CATEGORIA_PRECO[valor];
  return ROTULOS_CATEGORIA_PRECO[CATEGORIA_PRECO_PADRAO];
}

export function ehPessoaJuridica(tipo: string | null | undefined) {
  return tipo === TIPO_PESSOA_JURIDICA;
}

export function telefoneWhatsAppCliente(cliente: {
  tipo_pessoa?: string | null;
  telefone?: string | null;
  contato_telefone?: string | null;
}) {
  const bruto = ehPessoaJuridica(cliente.tipo_pessoa)
    ? cliente.contato_telefone
    : cliente.telefone;
  const digitos = (bruto ?? "").replace(/\D/g, "");
  return digitos || null;
}

export function nomeMensagemWhatsAppCliente(cliente: {
  tipo_pessoa?: string | null;
  nome: string;
  razao_social?: string | null;
}) {
  if (ehPessoaJuridica(cliente.tipo_pessoa)) {
    const razao = cliente.razao_social?.trim();
    if (razao) return razao;
  }
  return cliente.nome;
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
