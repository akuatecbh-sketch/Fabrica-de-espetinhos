import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { obterCaixaAberto } from "@/lib/caixa";
import { temAcessoMultiplo } from "@/lib/permissoes";
import { obterUsuarioSessao } from "@/lib/sessao";
import { BackofficeShell } from "./shell";

export const dynamic = "force-dynamic";

export default async function BackofficeLayout({
  children,
}: {
  children: ReactNode;
}) {
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
