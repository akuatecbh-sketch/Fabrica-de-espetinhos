"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/lib/sessao";
import {
  soDigitos,
  validarCnpj,
  validarCpf,
  validarEmail,
} from "@/lib/documento";
import {
  TIPO_PESSOA_FISICA,
  TIPO_PESSOA_JURIDICA,
  nomeExibicaoCliente,
  type TipoPessoaCliente,
} from "@/lib/cliente";
import { dataUtcMeiaNoite, ehIsoData } from "@/lib/financeiro";

export type ClienteFormState = {
  error?: string;
  tipo_pessoa?: TipoPessoaCliente;
};

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function erroUnico(erro: unknown) {
  return (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro &&
    erro.code === "P2002"
  );
}

function alvoUnico(erro: unknown) {
  if (typeof erro !== "object" || erro === null || !("meta" in erro)) {
    return [];
  }
  const alvo = (erro as { meta?: { target?: unknown } }).meta?.target;
  if (Array.isArray(alvo)) return alvo.map(String);
  if (typeof alvo === "string") return [alvo];
  return [];
}

function mensagemDocumentoDuplicado(erro: unknown, tipo: TipoPessoaCliente) {
  const alvo = alvoUnico(erro);
  if (alvo.some((campo) => campo.includes("cnpj"))) {
    return "Já existe um cliente com este CNPJ.";
  }
  if (alvo.some((campo) => campo.includes("cpf"))) {
    return "Já existe um cliente com este CPF.";
  }
  return tipo === TIPO_PESSOA_JURIDICA
    ? "Já existe um cliente com este CNPJ."
    : "Já existe um cliente com este CPF.";
}

function lerTelefone(valor: string, rotulo: string) {
  if (!valor) return { telefone: null as string | null };
  const digitos = soDigitos(valor);
  if (digitos.length < 10 || digitos.length > 11) {
    return { error: `${rotulo} inválido. Use DDD + número.` } as const;
  }
  return { telefone: digitos };
}

function lerDadosCliente(formData: FormData) {
  const tipoBruto = texto(formData, "tipo_pessoa");
  const tipo_pessoa: TipoPessoaCliente =
    tipoBruto === TIPO_PESSOA_JURIDICA
      ? TIPO_PESSOA_JURIDICA
      : tipoBruto === TIPO_PESSOA_FISICA
        ? TIPO_PESSOA_FISICA
        : ("" as TipoPessoaCliente);

  if (tipo_pessoa !== TIPO_PESSOA_FISICA && tipo_pessoa !== TIPO_PESSOA_JURIDICA) {
    return { error: "Selecione o tipo de cliente." } as const;
  }

  const telefoneBruto = texto(formData, "telefone");
  const email = texto(formData, "email");
  const endereco = texto(formData, "endereco");

  const telefoneEmpresa = lerTelefone(telefoneBruto, "Telefone");
  if ("error" in telefoneEmpresa) return { error: telefoneEmpresa.error };

  if (email && !validarEmail(email)) {
    return { error: "E-mail inválido." } as const;
  }
  if (email.length > 150) {
    return { error: "O e-mail deve ter no máximo 150 caracteres." } as const;
  }
  if (endereco.length > 255) {
    return { error: "O endereço deve ter no máximo 255 caracteres." } as const;
  }

  if (tipo_pessoa === TIPO_PESSOA_FISICA) {
    const nome = texto(formData, "nome");
    const cpfBruto = texto(formData, "cpf");
    const nascimentoBruto = texto(formData, "data_nascimento");

    if (!nome) return { error: "Informe o nome do cliente." } as const;
    if (nome.length > 150) {
      return { error: "O nome deve ter no máximo 150 caracteres." } as const;
    }

    let cpf: string | null = null;
    if (cpfBruto) {
      const digitos = soDigitos(cpfBruto);
      if (!validarCpf(digitos)) {
        return {
          error: "CPF inválido. Verifique os dígitos e tente novamente.",
        } as const;
      }
      cpf = digitos;
    }

    let data_nascimento: Date | null = null;
    if (nascimentoBruto) {
      if (!ehIsoData(nascimentoBruto)) {
        return { error: "Data de nascimento inválida." } as const;
      }
      data_nascimento = dataUtcMeiaNoite(nascimentoBruto);
    }

    return {
      data: {
        tipo_pessoa,
        nome,
        cpf,
        telefone: telefoneEmpresa.telefone,
        email: email || null,
        endereco: endereco || null,
        data_nascimento,
        razao_social: null,
        nome_fantasia: null,
        cnpj: null,
        inscricao_estadual: null,
        inscricao_municipal: null,
        contato_nome: null,
        contato_cargo: null,
        contato_telefone: null,
      },
    } as const;
  }

  const razao_social = texto(formData, "razao_social");
  const nome_fantasia = texto(formData, "nome_fantasia");
  const cnpjBruto = texto(formData, "cnpj");
  const inscricao_estadual = texto(formData, "inscricao_estadual");
  const inscricao_municipal = texto(formData, "inscricao_municipal");
  const contato_nome = texto(formData, "contato_nome");
  const contato_cargo = texto(formData, "contato_cargo");
  const contatoTelBruto = texto(formData, "contato_telefone");

  if (!razao_social) {
    return { error: "Informe a razão social." } as const;
  }
  if (razao_social.length > 150) {
    return { error: "A razão social deve ter no máximo 150 caracteres." } as const;
  }
  if (nome_fantasia.length > 150) {
    return { error: "O nome fantasia deve ter no máximo 150 caracteres." } as const;
  }

  const cnpj = soDigitos(cnpjBruto);
  if (!cnpj) {
    return { error: "Informe o CNPJ." } as const;
  }
  if (!validarCnpj(cnpj)) {
    return {
      error: "CNPJ inválido. Verifique os dígitos e tente novamente.",
    } as const;
  }

  if (inscricao_estadual.length > 20) {
    return {
      error: "A inscrição estadual deve ter no máximo 20 caracteres.",
    } as const;
  }
  if (inscricao_municipal.length > 20) {
    return {
      error: "A inscrição municipal deve ter no máximo 20 caracteres.",
    } as const;
  }
  if (contato_nome.length > 100) {
    return { error: "O nome do contato deve ter no máximo 100 caracteres." } as const;
  }
  if (contato_cargo.length > 80) {
    return { error: "O cargo do contato deve ter no máximo 80 caracteres." } as const;
  }

  const telefoneContato = lerTelefone(
    contatoTelBruto,
    "Telefone do contato",
  );
  if ("error" in telefoneContato) return { error: telefoneContato.error };

  const nome = nomeExibicaoCliente({
    tipo_pessoa,
    nome: razao_social,
    razao_social,
    nome_fantasia: nome_fantasia || null,
  });

  return {
    data: {
      tipo_pessoa,
      nome,
      cpf: null,
      telefone: telefoneEmpresa.telefone,
      email: email || null,
      endereco: endereco || null,
      data_nascimento: null,
      razao_social,
      nome_fantasia: nome_fantasia || null,
      cnpj,
      inscricao_estadual: inscricao_estadual || null,
      inscricao_municipal: inscricao_municipal || null,
      contato_nome: contato_nome || null,
      contato_cargo: contato_cargo || null,
      contato_telefone: telefoneContato.telefone,
    },
  } as const;
}

function tipoDoFormulario(formData: FormData): TipoPessoaCliente | undefined {
  const tipo = texto(formData, "tipo_pessoa");
  if (tipo === TIPO_PESSOA_FISICA || tipo === TIPO_PESSOA_JURIDICA) return tipo;
}

function revalidar() {
  revalidatePath("/clientes");
}

export async function criarCliente(
  _estado: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  await exigirModulo("clientes");
  const tipo_pessoa = tipoDoFormulario(formData);
  const resultado = lerDadosCliente(formData);
  if ("error" in resultado) return { error: resultado.error, tipo_pessoa };

  try {
    await prisma.cliente.create({ data: resultado.data });
  } catch (erro) {
    if (erroUnico(erro)) {
      return {
        error: mensagemDocumentoDuplicado(erro, resultado.data.tipo_pessoa),
        tipo_pessoa,
      };
    }
    return { error: "Não foi possível cadastrar o cliente.", tipo_pessoa };
  }

  revalidar();
  redirect("/clientes");
}

export async function atualizarCliente(
  id: number,
  _estado: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  await exigirModulo("clientes");
  if (!Number.isInteger(id)) return { error: "Cliente inválido." };
  const tipo_pessoa = tipoDoFormulario(formData);
  const resultado = lerDadosCliente(formData);
  if ("error" in resultado) return { error: resultado.error, tipo_pessoa };

  try {
    await prisma.cliente.update({
      where: { id },
      data: resultado.data,
    });
  } catch (erro) {
    if (erroUnico(erro)) {
      return {
        error: mensagemDocumentoDuplicado(erro, resultado.data.tipo_pessoa),
        tipo_pessoa,
      };
    }
    return { error: "Não foi possível atualizar o cliente.", tipo_pessoa };
  }

  revalidar();
  redirect("/clientes");
}

export async function excluirCliente(
  id: number,
): Promise<{ error?: string }> {
  await exigirModulo("clientes");
  if (!Number.isInteger(id)) return { error: "Cliente inválido." };

  const existente = await prisma.cliente.findUnique({ where: { id } });
  if (!existente) return { error: "Cliente não encontrado." };

  const vendas = await prisma.venda.count({ where: { cliente_id: id } });
  if (vendas > 0) {
    return {
      error: `Não é possível excluir: ${vendas} venda(s) estão associadas a este cliente.`,
    };
  }

  const contas = await prisma.conta_receber.count({
    where: { cliente_id: id },
  });
  if (contas > 0) {
    return {
      error: `Não é possível excluir: ${contas} conta(s) a receber estão associadas a este cliente.`,
    };
  }

  await prisma.cliente.delete({ where: { id } });
  revalidar();
  return {};
}
