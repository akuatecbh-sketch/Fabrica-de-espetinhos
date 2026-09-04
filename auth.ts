import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials.email ?? "")
          .trim()
          .toLowerCase();
        const senha = String(credentials.password ?? "");
        if (!email || !senha) return null;

        const usuario = await prisma.usuario.findUnique({
          where: { email },
        });
        if (!usuario || !usuario.ativo) return null;

        const hash = usuario.senha_hash ?? "";
        if (!hash.startsWith("$2")) return null;

        const ok = await bcrypt.compare(senha, hash);
        if (!ok) return null;

        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { ultimo_login: new Date() },
        });

        return {
          id: String(usuario.id),
          nome: usuario.nome,
          perfil: usuario.perfil,
          email: usuario.email,
          senha_provisoria: usuario.senha_provisoria,
        };
      },
    }),
  ],
});
