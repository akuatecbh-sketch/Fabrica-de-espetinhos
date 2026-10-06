"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = {
  error?: string;
};

function codigoCredencial(erro: unknown) {
  if (erro instanceof CredentialsSignin) return erro.code;
  if (erro && typeof erro === "object" && "code" in erro) {
    return String((erro as { code: unknown }).code ?? "");
  }
  if (erro instanceof AuthError && erro.cause && typeof erro.cause === "object") {
    const causa = erro.cause as { code?: unknown; err?: { code?: unknown } };
    if (typeof causa.code === "string") return causa.code;
    if (typeof causa.err?.code === "string") return causa.err.code;
  }
  return "";
}

export async function autenticar(
  _estado: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "E-mail ou senha incorretos" };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (erro) {
    if (erro instanceof AuthError) {
      if (codigoCredencial(erro) === "servico_indisponivel") {
        return {
          error: "Não foi possível entrar agora. Tente novamente em instantes.",
        };
      }
      return { error: "E-mail ou senha incorretos" };
    }
    throw erro;
  }

  return {};
}
