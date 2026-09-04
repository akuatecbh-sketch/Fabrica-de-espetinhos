/**
 * middleware.ts (Edge Runtime) em vez de proxy.ts (Node.js runtime no Next.js 16).
 * O adaptador opennextjs-netlify ainda não processa proxy.ts em Node.js
 * corretamente (issue #3171, repositório opennextjs-netlify). O middleware.ts
 * continua suportado no Next.js 16 (descontinuado, não removido) e o Netlify
 * executa Edge Runtime normalmente.
 *
 * Aqui só entra autenticação via cookie JWT (login e senha provisória).
 * Autorização por módulo fica nas páginas com exigirAcesso(), porque Prisma
 * não roda em Edge Runtime.
 */
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
