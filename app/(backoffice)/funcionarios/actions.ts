"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirRh } from "@/lib/sessao";
import {
  soDigitos,
  validarCpf,
  validarEmail,
} from "@/lib/documento";
import { dataLocalISO, dataUtcMeiaNoite, ehIsoData, isoDaData } from "@/lib/financeiro";
import {
  DIAS_FERIAS_ANO,
  calcularFimProgramado,
  dadosPrimeiroPeriodo,
  dadosProximoPeriodo,
} from "@/lib/rh";
import {
  SELECT_USUARIO_RELACAO,
  ehSuperAdmin,
  filtroOcultarSuperAdmin,
  nomeExibicao,
  podeVerSuperAdmin,
  superAdminOcultoPara,
} from "@/lib/visibilidade";

export type FuncionarioFormState = {
  error?: string;
};

export type FeriasFormState = {
  error?: string;
};

export type UsuarioOpcao = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
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

function revalidar(funcionarioId?: number) {
  revalidatePath("/funcionarios", "layout");
  revalidatePath("/");
  if (funcionarioId) {
    revalidatePath(`/funcionarios/${funcionarioId}/editar`);
    revalidatePath(`/funcionarios/${funcionarioId}/ferias`);
  }
}

async function usuariosDisponiveis(
  perfilLogado: string,
  funcionarioId?: number,
) {
  return prisma.usuario.findMany({
    where: {
      ...filtroOcultarSuperAdmin(perfilLogado),
      OR: [
        { ativo: true, funcionario: { none: {} } },
        ...(funcionarioId
          ? [{ funcionario: { some: { id: funcionarioId } } }]
          : []),
      ],
    },
    select: { id: true, ...SELECT_USUARIO_RELACAO },
    orderBy: { nome: "asc" },
  });
}

export async function listarUsuariosDisponiveis(funcionarioId?: number) {
  const logado = await exigirRh();
  const registros = await usuariosDisponiveis(logado.perfil, funcionarioId);
  return registros.map((usuario) => {
    const visivel = nomeExibicao(usuario, logado.perfil);
    return {
      id: usuario.id,
      nome: visivel.nome,
      email: visivel.email,
      perfil: usuario.perfil,
    };
  });
}

async function garantirUsuarioVinculavel(
  usuarioId: number,
  perfilLogado: string,
) {
  const alvo = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { perfil: true },
  });
  if (!alvo || superAdminOcultoPara(perfilLogado, alvo.perfil)) {
    return { error: "Usuário vinculado inválido." } as const;
  }
  return {} as const;
}

async function usuarioLivre(usuarioId: number, funcionarioId?: number) {
  const ocupado = await prisma.funcionario.findFirst({
    where: {
      usuario_id: usuarioId,
      ...(funcionarioId ? { id: { not: funcionarioId } } : {}),
    },
    select: { id: true },
  });
  return ocupado == null;
}

function lerDadosFuncionario(formData: FormData) {
  const nome = texto(formData, "nome");
  const cpfBruto = texto(formData, "cpf");
  const rg = texto(formData, "rg");
  const nascimentoBruto = texto(formData, "data_nascimento");
  const telefoneBruto = texto(formData, "telefone");
  const email = texto(formData, "email");
  const endereco = texto(formData, "endereco");
  const cargo = texto(formData, "cargo");
  const salarioBruto = texto(formData, "salario").replace(",", ".");
  const admissaoBruto = texto(formData, "data_admissao");
  const usuarioBruto = texto(formData, "usuario_id");

  if (!nome) return { error: "Informe o nome do funcionário." } as const;
  if (nome.length > 150) {
    return { error: "O nome deve ter no máximo 150 caracteres." } as const;
  }

  const cpf = soDigitos(cpfBruto);
  if (!validarCpf(cpf)) {
    return { error: "CPF inválido. Verifique os dígitos e tente novamente." } as const;
  }

  if (rg.length > 20) {
    return { error: "O RG deve ter no máximo 20 caracteres." } as const;
  }

  if (!ehIsoData(nascimentoBruto)) {
    return { error: "Data de nascimento inválida." } as const;
  }

  let telefone: string | null = null;
  if (telefoneBruto) {
    const digitos = soDigitos(telefoneBruto);
    if (digitos.length < 10 || digitos.length > 11) {
      return { error: "Telefone inválido. Use DDD + número." } as const;
    }
    telefone = digitos;
  }

  if (email && !validarEmail(email)) {
    return { error: "E-mail inválido." } as const;
  }
  if (email.length > 150) {
    return { error: "O e-mail deve ter no máximo 150 caracteres." } as const;
  }
  if (endereco.length > 255) {
    return { error: "O endereço deve ter no máximo 255 caracteres." } as const;
  }

  if (!cargo) return { error: "Informe o cargo." } as const;
  if (cargo.length > 80) {
    return { error: "O cargo deve ter no máximo 80 caracteres." } as const;
  }

  const salario = Number(salarioBruto);
  if (!Number.isFinite(salario) || salario < 0) {
    return { error: "Salário inválido." } as const;
  }

  if (!ehIsoData(admissaoBruto)) {
    return { error: "Data de admissão inválida." } as const;
  }

  let usuario_id: number | null = null;
  if (usuarioBruto) {
    const id = Number(usuarioBruto);
    if (!Number.isInteger(id) || id <= 0) {
      return { error: "Usuário vinculado inválido." } as const;
    }
    usuario_id = id;
  }

  return {
    data: {
      nome,
      cpf,
      rg: rg || null,
      data_nascimento: dataUtcMeiaNoite(nascimentoBruto),
      telefone,
      email: email || null,
      endereco: endereco || null,
      cargo,
      salario,
      data_admissao: dataUtcMeiaNoite(admissaoBruto),
      usuario_id,
    },
  } as const;
}

export async function criarFuncionario(
  _estado: FuncionarioFormState,
  formData: FormData,
): Promise<FuncionarioFormState> {
  const logado = await exigirRh();
  const resultado = lerDadosFuncionario(formData);
  if ("error" in resultado) return { error: resultado.error };

  if (resultado.data.usuario_id) {
    const vinculo = await garantirUsuarioVinculavel(
      resultado.data.usuario_id,
      logado.perfil,
    );
    if ("error" in vinculo) return { error: vinculo.error };
    const livre = await usuarioLivre(resultado.data.usuario_id);
    if (!livre) {
      return { error: "Este usuário já está vinculado a outro funcionário." };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const criado = await tx.funcionario.create({ data: resultado.data });
      await tx.ferias.create({
        data: {
          funcionario_id: criado.id,
          ...dadosPrimeiroPeriodo(resultado.data.data_admissao),
        },
      });
    });
  } catch (erro) {
    if (erroUnico(erro)) {
      return { error: "Já existe um funcionário com este CPF." };
    }
    throw erro;
  }

  revalidar();
  redirect("/funcionarios");
}

export async function atualizarFuncionario(
  id: number,
  _estado: FuncionarioFormState,
  formData: FormData,
): Promise<FuncionarioFormState> {
  const logado = await exigirRh();
  if (!Number.isInteger(id)) return { error: "Funcionário inválido." };
  const resultado = lerDadosFuncionario(formData);
  if ("error" in resultado) return { error: resultado.error };

  const existente = await prisma.funcionario.findUnique({ where: { id } });
  if (!existente) return { error: "Funcionário não encontrado." };

  let usuario_id = resultado.data.usuario_id;
  if (usuario_id) {
    const vinculo = await garantirUsuarioVinculavel(usuario_id, logado.perfil);
    if ("error" in vinculo) return { error: vinculo.error };
    const livre = await usuarioLivre(usuario_id, id);
    if (!livre) {
      return { error: "Este usuário já está vinculado a outro funcionário." };
    }
  } else if (existente.usuario_id) {
    const atual = await prisma.usuario.findUnique({
      where: { id: existente.usuario_id },
      select: { perfil: true },
    });
    if (
      atual &&
      ehSuperAdmin(atual.perfil) &&
      !podeVerSuperAdmin(logado.perfil)
    ) {
      usuario_id = existente.usuario_id;
    }
  }

  try {
    await prisma.funcionario.update({
      where: { id },
      data: { ...resultado.data, usuario_id },
    });
  } catch (erro) {
    if (erroUnico(erro)) {
      return { error: "Já existe um funcionário com este CPF." };
    }
    throw erro;
  }

  revalidar(id);
  redirect("/funcionarios");
}

export async function desligarFuncionario(
  id: number,
  dataDemissaoIso: string,
): Promise<{ error?: string }> {
  await exigirRh();
  if (!Number.isInteger(id)) return { error: "Funcionário inválido." };
  if (!ehIsoData(dataDemissaoIso)) {
    return { error: "Informe a data de demissão." };
  }

  const existente = await prisma.funcionario.findUnique({ where: { id } });
  if (!existente) return { error: "Funcionário não encontrado." };
  if (!existente.ativo) {
    return { error: "Este funcionário já está desligado." };
  }

  const demissao = dataUtcMeiaNoite(dataDemissaoIso);
  if (demissao.getTime() < existente.data_admissao.getTime()) {
    return { error: "A data de demissão não pode ser anterior à admissão." };
  }

  await prisma.funcionario.update({
    where: { id },
    data: {
      ativo: false,
      data_demissao: demissao,
    },
  });

  revalidar(id);
  return {};
}

export async function programarFerias(
  funcionarioId: number,
  feriasId: number,
  _estado: FeriasFormState,
  formData: FormData,
): Promise<FeriasFormState> {
  await exigirRh();
  if (!Number.isInteger(funcionarioId) || !Number.isInteger(feriasId)) {
    return { error: "Registro inválido." };
  }

  const inicioIso = texto(formData, "data_inicio_programada");
  const gozadosBruto = Number(texto(formData, "dias_gozados"));
  const vendidosBruto = Number(texto(formData, "dias_vendidos") || "0");

  if (!ehIsoData(inicioIso)) {
    return { error: "Informe a data de início das férias." };
  }
  if (!Number.isInteger(gozadosBruto) || gozadosBruto < 1) {
    return { error: "Informe os dias gozados (mínimo 1)." };
  }
  if (!Number.isInteger(vendidosBruto) || vendidosBruto < 0) {
    return { error: "Dias vendidos inválidos." };
  }
  if (gozadosBruto + vendidosBruto > DIAS_FERIAS_ANO) {
    return {
      error: `A soma de dias gozados e vendidos não pode passar de ${DIAS_FERIAS_ANO}.`,
    };
  }

  const periodo = await prisma.ferias.findUnique({
    where: { id: feriasId },
  });
  if (!periodo || periodo.funcionario_id !== funcionarioId) {
    return { error: "Período de férias não encontrado." };
  }
  if (periodo.status !== "pendente") {
    return { error: "Só é possível programar um período pendente." };
  }

  const inicio = dataUtcMeiaNoite(inicioIso);
  const fim = calcularFimProgramado(inicio, gozadosBruto);

  await prisma.ferias.update({
    where: { id: feriasId },
    data: {
      data_inicio_programada: inicio,
      data_fim_programada: fim,
      dias_gozados: gozadosBruto,
      dias_vendidos: vendidosBruto,
      status: "programada",
    },
  });

  revalidar(funcionarioId);
  return {};
}

export async function marcarFeriasGozada(
  funcionarioId: number,
  feriasId: number,
): Promise<{ error?: string }> {
  await exigirRh();
  if (!Number.isInteger(funcionarioId) || !Number.isInteger(feriasId)) {
    return { error: "Registro inválido." };
  }

  const periodo = await prisma.ferias.findUnique({
    where: { id: feriasId },
  });
  if (!periodo || periodo.funcionario_id !== funcionarioId) {
    return { error: "Período de férias não encontrado." };
  }
  if (periodo.status !== "programada") {
    return { error: "Só é possível marcar como gozada um período programado." };
  }
  if (!periodo.data_fim_programada) {
    return { error: "Este período não tem data de fim programada." };
  }
  if (isoDaData(periodo.data_fim_programada) > dataLocalISO()) {
    return {
      error: "Só é possível marcar como gozada depois do fim das férias programadas.",
    };
  }

  const proximo = dadosProximoPeriodo(periodo.periodo_aquisitivo_fim);

  await prisma.$transaction(async (tx) => {
    await tx.ferias.update({
      where: { id: feriasId },
      data: { status: "gozada" },
    });

    const jaExiste = await tx.ferias.findFirst({
      where: {
        funcionario_id: funcionarioId,
        periodo_aquisitivo_inicio: proximo.periodo_aquisitivo_inicio,
      },
    });
    if (!jaExiste) {
      await tx.ferias.create({
        data: {
          funcionario_id: funcionarioId,
          ...proximo,
        },
      });
    }
  });

  revalidar(funcionarioId);
  return {};
}
