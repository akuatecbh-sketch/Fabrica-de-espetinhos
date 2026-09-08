import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { obterCaixaAberto } from "@/lib/caixa";
import { temAcessoMultiplo } from "@/lib/permissoes";
import { obterUsuarioSessao } from "@/lib/sessao";
import { BackofficeShell } from "./shell";

export const dynamic = "force-dynamic";

function ehRevisaoPublica(pathname: string) {
  return (
    pathname === "/pedidos/publico" ||
    pathname.startsWith("/pedidos/publico/")
  );
}

export default async function BackofficeLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (ehRevisaoPublica(pathname)) {
    return children;
  }

  const [usuario, caixa] = await Promise.all([
    obterUsuarioSessao(),
    obterCaixaAberto(),
  ]);
  if (usuario.senha_provisoria) redirect("/trocar-senha");
  const acessos = await temAcessoMultiplo(usuario.id);
  return (
    <BackofficeShell
      caixaAberto={caixa != null}
      perfil={usuario.perfil}
      nome={usuario.nome}
      acessos={acessos}
    >
      {children}
    </BackofficeShell>
  );
}
