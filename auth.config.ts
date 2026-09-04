import type { NextAuthConfig } from "next-auth";
import { rotaPublica } from "@/lib/acesso";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = Number(user.id);
        token.nome = user.nome;
        token.perfil = user.perfil;
        token.senha_provisoria = Boolean(user.senha_provisoria);
        token.name = user.nome;
      }
      return token;
    },
    session({ session, token }) {
      session.usuario = {
        id: Number(token.id),
        nome: String(token.nome ?? ""),
        perfil: String(token.perfil ?? ""),
        senha_provisoria: Boolean(token.senha_provisoria),
      };
      if (session.user) {
        session.user.name = session.usuario.nome;
      }
      return session;
    },
    authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname;
      if (rotaPublica(pathname) && pathname !== "/login") return true;

      const logado = Boolean(auth?.usuario?.id);
      const login = pathname === "/login" || pathname.startsWith("/login/");
      const trocarSenha =
        pathname === "/trocar-senha" || pathname.startsWith("/trocar-senha/");
      const provisoria = Boolean(auth?.usuario?.senha_provisoria);

      if (login) {
        if (logado) {
          return Response.redirect(
            new URL(provisoria ? "/trocar-senha" : "/", request.nextUrl),
          );
        }
        return true;
      }

      if (!logado) return false;

      if (provisoria) {
        if (trocarSenha) return true;
        return Response.redirect(new URL("/trocar-senha", request.nextUrl));
      }

      if (trocarSenha) {
        return Response.redirect(new URL("/", request.nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
