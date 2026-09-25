import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ehChaveBackup, obterBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ chave: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const sessao = await auth();
  if (!sessao?.usuario?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (sessao.usuario.perfil !== "super_admin") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { chave } = await params;
  const nome = decodeURIComponent(chave);
  if (!ehChaveBackup(nome)) {
    return NextResponse.json({ error: "Backup inválido." }, { status: 400 });
  }

  const conteudo = await obterBackup(nome);
  if (!conteudo) {
    return NextResponse.json({ error: "Backup não encontrado." }, { status: 404 });
  }

  return new NextResponse(conteudo, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
