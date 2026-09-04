import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { exigirAcesso, temAcesso } from "@/lib/permissoes";

export async function obterUsuarioSessao() {
  const sessao = await auth();
  const usuario = sessao?.usuario;
  if (!usuario?.id) redirect("/login");
  return usuario;
}

export async function exigirSuperAdmin() {
  const usuario = await obterUsuarioSessao();
  if (usuario.perfil !== "super_admin") {
    redirect("/acesso-negado");
  }
  return usuario;
}

export async function exigirGerenteOuSuperAdmin() {
  const usuario = await obterUsuarioSessao();
  if (usuario.perfil !== "super_admin" && usuario.perfil !== "gerente") {
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
  return exigirAcesso(moduloChave);
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
