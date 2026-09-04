import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    nome: string;
    perfil: string;
    senha_provisoria: boolean;
  }

  interface Session {
    usuario: {
      id: number;
      nome: string;
      perfil: string;
      senha_provisoria: boolean;
    };
    user: DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: number;
    nome?: string;
    perfil?: string;
    senha_provisoria?: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: number;
    nome?: string;
    perfil?: string;
    senha_provisoria?: boolean;
  }
}
