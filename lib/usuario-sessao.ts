import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export type UsuarioSessao = {
  id: number;
  nome: string;
  perfil: string;
  senha_provisoria: boolean;
  ativo: boolean;
};

const carregarUsuarioDoBanco = cache(async (): Promise<
  | { estado: "sem_sessao" }
  | { estado: "invalido" }
  | { estado: "ok"; usuario: UsuarioSessao }
> => {
  const sessao = await auth();
  const id = sessao?.usuario?.id;
  if (!id) return { estado: "sem_sessao" };

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      perfil: true,
      senha_provisoria: true,
      ativo: true,
    },
  });
  if (!usuario || !usuario.ativo) return { estado: "invalido" };
  return { estado: "ok", usuario };
});

export async function obterUsuarioSessao() {
  const resultado = await carregarUsuarioDoBanco();
  if (resultado.estado === "ok") return resultado.usuario;
  if (resultado.estado === "invalido") {
    await signOut({ redirectTo: "/login" });
  }
  redirect("/login");
}
