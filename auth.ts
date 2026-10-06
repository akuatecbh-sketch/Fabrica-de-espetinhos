import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";
import { authConfig } from "@/auth.config";

class ServicoIndisponivelError extends CredentialsSignin {
  code = "servico_indisponivel";
}

type MotivoFalhaLogin =
  | "usuario_nao_encontrado"
  | "inativo"
  | "senha_incorreta"
  | "erro_banco";

function avisarFalhaLogin(motivo: MotivoFalhaLogin, email: string) {
  console.warn("login.falha", { motivo, email });
}

async function auditarFalhaLogin(usuarioId: number, motivo: MotivoFalhaLogin) {
  try {
    await registrarAuditoria({
      usuarioId,
      acao: "login.falha",
      entidadeTipo: "usuario",
      entidadeId: usuarioId,
      valorNovo: { motivo },
    });
  } catch {
    /* nunca impede o login */
  }
}

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

        try {
          const usuario = await prisma.usuario.findUnique({
            where: { email },
          });
          if (!usuario) {
            avisarFalhaLogin("usuario_nao_encontrado", email);
            return null;
          }
          if (!usuario.ativo) {
            avisarFalhaLogin("inativo", email);
            await auditarFalhaLogin(usuario.id, "inativo");
            return null;
          }

          const hash = usuario.senha_hash ?? "";
          if (!hash.startsWith("$2") || !(await bcrypt.compare(senha, hash))) {
            avisarFalhaLogin("senha_incorreta", email);
            await auditarFalhaLogin(usuario.id, "senha_incorreta");
            return null;
          }

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
        } catch (erro) {
          if (erro instanceof CredentialsSignin) throw erro;
          avisarFalhaLogin("erro_banco", email);
          console.error("login.falha erro_banco", erro);
          throw new ServicoIndisponivelError();
        }
      },
    }),
  ],
});
