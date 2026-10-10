import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CABECALHO_KEEPALIVE,
  tokenKeepaliveValido,
} from "@/lib/keepalive-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function recusar() {
  return new NextResponse(null, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(req: Request) {
  const recebido = req.headers.get(CABECALHO_KEEPALIVE);
  if (!tokenKeepaliveValido(recebido, process.env.KEEPALIVE_TOKEN)) {
    return recusar();
  }

  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
