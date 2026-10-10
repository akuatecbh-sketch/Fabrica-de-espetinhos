import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { carregarContextoAcesso } from "@/lib/contexto-acesso";

export type { UsuarioSessao } from "@/lib/usuario-tipos";

export async function obterUsuarioSessao() {
  const resultado = await carregarContextoAcesso();
  if (resultado.estado === "ok") return resultado.usuario;
  if (resultado.estado === "invalido") {
    await signOut({ redirectTo: "/login" });
  }
  redirect("/login");
}
