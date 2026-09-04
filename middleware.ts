/**
 * middleware.ts (Edge Runtime) em vez de proxy.ts (Node.js runtime no Next.js 16).
 * O adaptador opennextjs-netlify ainda não processa proxy.ts em Node.js
 * corretamente (issue #3171, repositório opennextjs-netlify). O middleware.ts
 * continua suportado no Next.js 16 (descontinuado, não removido) e o Netlify
 * executa Edge Runtime normalmente.
 */
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { temAcesso } from "@/lib/permissoes";
import { moduloChaveDaRota } from "@/lib/permissoes-rotas";

const { auth } = NextAuth(authConfig);

const middleware = auth(async (req) => {
  const pathname = req.nextUrl.pathname;
  const usuarioId = req.auth?.usuario?.id;
  const perfil = req.auth?.usuario?.perfil;
  const telaPermissoes =
    pathname === "/permissoes" || pathname.startsWith("/permissoes/");
  const telaAjuda =
    pathname === "/ajuda" || pathname.startsWith("/ajuda/");
  const telaCupomNaoFiscal = /^\/vendas\/\d+\/cupom\/?$/.test(pathname);

  if (usuarioId && telaPermissoes && perfil !== "super_admin") {
    return NextResponse.redirect(new URL("/acesso-negado", req.nextUrl));
  }

  if (
    usuarioId &&
    telaAjuda &&
    perfil !== "super_admin" &&
    perfil !== "gerente"
  ) {
    return NextResponse.redirect(new URL("/acesso-negado", req.nextUrl));
  }

  if (usuarioId && telaCupomNaoFiscal) {
    const [vendas, pdv] = await Promise.all([
      temAcesso(usuarioId, "vendas"),
      temAcesso(usuarioId, "pdv"),
    ]);
    if (!vendas && !pdv) {
      return NextResponse.redirect(new URL("/acesso-negado", req.nextUrl));
    }
    return;
  }

  const chave = moduloChaveDaRota(pathname);

  if (usuarioId && chave && !(await temAcesso(usuarioId, chave))) {
    return NextResponse.redirect(new URL("/acesso-negado", req.nextUrl));
  }
});

export default middleware;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
