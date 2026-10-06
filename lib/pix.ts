import { soDigitos, validarCnpjCpf, validarEmail, formatarCnpjCpf, formatarTelefone } from "@/lib/documento";

export const TIPOS_CHAVE_PIX = [
  "cpf_cnpj",
  "telefone",
  "email",
  "aleatoria",
] as const;

export type TipoChavePix = (typeof TIPOS_CHAVE_PIX)[number];

export type DadosPix = {
  pix_tipo: TipoChavePix | null;
  pix_chave: string | null;
  pix_beneficiario: string | null;
};

export function ehTipoChavePix(valor: string): valor is TipoChavePix {
  return (TIPOS_CHAVE_PIX as readonly string[]).includes(valor);
}

export function rotuloTipoChavePix(tipo: string | null | undefined) {
  if (tipo === "cpf_cnpj") return "CPF/CNPJ";
  if (tipo === "telefone") return "Telefone";
  if (tipo === "email") return "E-mail";
  if (tipo === "aleatoria") return "Aleatória";
  return tipo ?? "";
}

export function normalizarObservacaoCupom(
  valor: string | null | undefined,
): { ok: true; valor: string | null } | { ok: false; error: string } {
  const texto = (valor ?? "").trim();
  if (!texto) return { ok: true, valor: null };
  if (texto.length > 200) {
    return {
      ok: false,
      error: "A observação do cupom deve ter no máximo 200 caracteres.",
    };
  }
  return { ok: true, valor: texto };
}

export function cortarObservacaoCupom(valor: string | null | undefined) {
  const texto = (valor ?? "").trim();
  if (!texto) return null;
  return texto.slice(0, 200);
}

function normalizarChavePix(
  tipo: TipoChavePix,
  chaveBruta: string,
): { ok: true; chave: string } | { ok: false; error: string } {
  const chave = chaveBruta.trim();
  if (!chave) {
    return { ok: false, error: "Informe a chave PIX." };
  }

  if (tipo === "cpf_cnpj") {
    const digitos = soDigitos(chave);
    if (!validarCnpjCpf(digitos)) {
      return {
        ok: false,
        error: "Chave PIX inválida. Informe um CPF ou CNPJ válido.",
      };
    }
    return { ok: true, chave: digitos };
  }
  if (tipo === "telefone") {
    const digitos = soDigitos(chave);
    if (digitos.length < 10 || digitos.length > 11) {
      return {
        ok: false,
        error: "Chave PIX de telefone inválida. Use DDD + número.",
      };
    }
    return { ok: true, chave: digitos };
  }
  if (tipo === "email") {
    if (!validarEmail(chave) || chave.length > 100) {
      return { ok: false, error: "Chave PIX de e-mail inválida." };
    }
    return { ok: true, chave: chave.toLowerCase() };
  }
  const aleatoria = chave.replace(/\s/g, "");
  if (aleatoria.length < 8 || aleatoria.length > 36) {
    return {
      ok: false,
      error: "Chave PIX aleatória inválida. Use a chave gerada pelo banco.",
    };
  }
  if (!/^[0-9a-f-]+$/i.test(aleatoria)) {
    return {
      ok: false,
      error: "Chave PIX aleatória inválida. Use a chave gerada pelo banco.",
    };
  }
  return { ok: true, chave: aleatoria };
}

export function lerDadosPix(params: {
  tipoBruto: string;
  chaveBruta: string;
  beneficiarioBruto: string;
}): DadosPix | { error: string } {
  const tipoBruto = params.tipoBruto.trim();
  const chaveBruta = params.chaveBruta.trim();
  const beneficiario = params.beneficiarioBruto.trim();

  if (beneficiario.length > 150) {
    return { error: "O beneficiário PIX deve ter no máximo 150 caracteres." };
  }

  if (!tipoBruto && !chaveBruta) {
    return {
      pix_tipo: null,
      pix_chave: null,
      pix_beneficiario: null,
    };
  }

  if (!ehTipoChavePix(tipoBruto)) {
    return { error: "Selecione o tipo da chave PIX." };
  }
  if (!chaveBruta) {
    return {
      pix_tipo: null,
      pix_chave: null,
      pix_beneficiario: null,
    };
  }

  const chave = normalizarChavePix(tipoBruto, chaveBruta);
  if (!chave.ok) return { error: chave.error };

  return {
    pix_tipo: tipoBruto,
    pix_chave: chave.chave,
    pix_beneficiario: beneficiario || null,
  };
}

export function snapshotPixDe(empresa: {
  pix_tipo: string | null;
  pix_chave: string | null;
  pix_beneficiario: string | null;
} | null): DadosPix {
  const chave = (empresa?.pix_chave ?? "").trim();
  const tipo = (empresa?.pix_tipo ?? "").trim();
  if (!chave || !ehTipoChavePix(tipo)) {
    return { pix_tipo: null, pix_chave: null, pix_beneficiario: null };
  }
  const beneficiario = (empresa?.pix_beneficiario ?? "").trim();
  return {
    pix_tipo: tipo,
    pix_chave: chave,
    pix_beneficiario: beneficiario || null,
  };
}

export function formatarChavePixCupom(
  tipo: string | null | undefined,
  chave: string | null | undefined,
) {
  const valor = (chave ?? "").trim();
  if (!valor) return "";
  if (tipo === "cpf_cnpj") return formatarCnpjCpf(valor);
  if (tipo === "telefone") {
    const tel = formatarTelefone(valor);
    return tel === "—" ? valor : tel;
  }
  return valor;
}
