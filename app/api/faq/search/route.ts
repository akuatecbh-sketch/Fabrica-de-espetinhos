import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { buscarFaq } from "@/lib/faq";

export async function GET(req: NextRequest) {
  const sessao = await auth();
  const usuarioId = sessao?.usuario?.id;
  if (!usuarioId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const itens = await buscarFaq(usuarioId, q);
  return NextResponse.json({ itens });
}
