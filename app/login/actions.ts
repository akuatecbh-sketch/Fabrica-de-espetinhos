"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = {
  error?: string;
};

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
      return { error: "E-mail ou senha incorretos" };
    }
    throw erro;
  }

  return {};
}
