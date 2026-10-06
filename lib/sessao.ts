import { redirect } from "next/navigation";
import { temAcesso } from "@/lib/permissoes";
import { obterUsuarioSessao } from "@/lib/usuario-sessao";

export type { UsuarioSessao } from "@/lib/usuario-sessao";
export { obterUsuarioSessao } from "@/lib/usuario-sessao";

export async function exigirSuperAdmin() {
  const usuario = await obterUsuarioSessao();
  if (usuario.perfil !== "super_admin") {
    redirect("/acesso-negado");
  }
  return usuario;
}

export async function exigirSuperAdminOuProprietario() {
  const usuario = await obterUsuarioSessao();
  if (usuario.perfil !== "super_admin" && usuario.perfil !== "proprietario") {
    redirect("/acesso-negado");
  }
  return usuario;
}

export async function exigirGerenteOuSuperAdmin() {
  const usuario = await obterUsuarioSessao();
  if (
    usuario.perfil !== "super_admin" &&
    usuario.perfil !== "proprietario" &&
    usuario.perfil !== "gerente"
  ) {
    redirect("/acesso-negado");
  }
  return usuario;
}

export async function exigirPdvOuVendas() {
  const usuario = await obterUsuarioSessao();
  const [pdv, vendas] = await Promise.all([
    temAcesso(usuario.id, "pdv"),
    temAcesso(usuario.id, "vendas"),
  ]);
  if (!pdv && !vendas) {
    redirect("/acesso-negado");
  }
  return usuario;
}

export async function exigirModulo(moduloChave: string) {
  const usuario = await obterUsuarioSessao();
  if (!(await temAcesso(usuario.id, moduloChave))) {
    redirect("/acesso-negado");
  }
  return usuario;
}

export async function exigirCompras() {
  return exigirModulo("compras");
}

export async function exigirEstoque() {
  return exigirModulo("estoque");
}

export async function exigirModuloUsuarios() {
  return exigirModulo("usuarios");
}

export async function exigirRh() {
  return exigirModulo("funcionarios");
}
