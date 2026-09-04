import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { obterLogoBlob } from "@/lib/empresa-logo";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessao = await auth();
  if (!sessao?.usuario?.id) {
    return new NextResponse(null, { status: 401 });
  }

  const logo = await obterLogoBlob();
  if (!logo) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(logo.data, {
    headers: {
      "Content-Type": logo.contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
