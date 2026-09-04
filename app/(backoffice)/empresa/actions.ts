"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  soDigitos,
  validarCnpj,
  validarEmail,
} from "@/lib/documento";
import {
  LOGO_PUBLICA,
  contentTypeDaExtensao,
  salvarLogoBlob,
} from "@/lib/empresa-logo";
import { exigirModulo } from "@/lib/sessao";

export type EmpresaFormState = {
  error?: string;
  ok?: boolean;
};

const EMPRESA_ID = 1;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const PNG_ASSINATURA = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JPEG_ASSINATURA = Buffer.from([0xff, 0xd8, 0xff]);

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function extensaoLogo(arquivo: File, bytes: Buffer) {
  const nome = arquivo.name.toLowerCase();
  const tipo = arquivo.type.toLowerCase();
  const ehPng = bytes.subarray(0, 4).equals(PNG_ASSINATURA);
  const ehJpeg = bytes.subarray(0, 3).equals(JPEG_ASSINATURA);
  const pediuPng = tipo === "image/png" || nome.endsWith(".png");
  const pediuJpeg =
    tipo === "image/jpeg" ||
    tipo === "image/jpg" ||
    nome.endsWith(".jpg") ||
    nome.endsWith(".jpeg");

  if (ehPng && (pediuPng || tipo === "")) return "png" as const;
  if (ehJpeg && (pediuJpeg || tipo === "")) return "jpg" as const;
  if (ehPng) return "png" as const;
  if (ehJpeg) return "jpg" as const;
  return null;
}

async function salvarLogo(arquivo: File): Promise<
  { url: string } | { error: string }
> {
  if (arquivo.size > MAX_LOGO_BYTES) {
    return { error: "A logomarca deve ter no máximo 2 MB." };
  }

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const extensao = extensaoLogo(arquivo, bytes);
  if (!extensao) {
    return { error: "Envie uma imagem PNG ou JPG." };
  }

  try {
    await salvarLogoBlob(bytes, contentTypeDaExtensao(extensao));
  } catch {
    return {
      error:
        "Não foi possível gravar a logomarca. O envio funciona após publicar no Netlify.",
    };
  }
  return { url: LOGO_PUBLICA };
}

function lerDadosEmpresa(formData: FormData) {
  const razao_social = texto(formData, "razao_social");
  const nome_fantasia = texto(formData, "nome_fantasia");
  const cnpjBruto = texto(formData, "cnpj");
  const endereco = texto(formData, "endereco");
  const telefoneBruto = texto(formData, "telefone");
  const email = texto(formData, "email");

  if (!razao_social) {
    return { error: "Informe a razão social." } as const;
  }
  if (razao_social.length > 150) {
    return { error: "A razão social deve ter no máximo 150 caracteres." } as const;
  }
  if (nome_fantasia.length > 150) {
    return { error: "O nome fantasia deve ter no máximo 150 caracteres." } as const;
  }

  let cnpj: string | null = null;
  if (cnpjBruto) {
    const digitos = soDigitos(cnpjBruto);
    if (!validarCnpj(digitos)) {
      return {
        error: "CNPJ inválido. Verifique os dígitos e tente novamente.",
      } as const;
    }
    cnpj = digitos;
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

  return {
    data: {
      razao_social,
      nome_fantasia: nome_fantasia || null,
      cnpj,
      endereco: endereco || null,
      telefone,
      email: email || null,
    },
  } as const;
}

export async function salvarEmpresa(
  _estado: EmpresaFormState,
  formData: FormData,
): Promise<EmpresaFormState> {
  await exigirModulo("empresa");
  const resultado = lerDadosEmpresa(formData);
  if ("error" in resultado) return { error: resultado.error };

  const logo = formData.get("logo");
  let logo_url: string | undefined;
  if (logo instanceof File && logo.size > 0) {
    const salvo = await salvarLogo(logo);
    if ("error" in salvo) return { error: salvo.error };
    logo_url = salvo.url;
  }

  const agora = new Date();
  await prisma.empresa.upsert({
    where: { id: EMPRESA_ID },
    create: {
      id: EMPRESA_ID,
      ...resultado.data,
      logo_url: logo_url ?? null,
      criado_em: agora,
      atualizado_em: agora,
    },
    update: {
      ...resultado.data,
      ...(logo_url ? { logo_url } : {}),
      atualizado_em: agora,
    },
  });

  revalidatePath("/empresa");
  revalidatePath("/etiquetas");
  revalidatePath("/api/logo");
  return { ok: true };
}
