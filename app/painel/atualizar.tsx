"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const INTERVALO_PAINEL_MS = 60_000;

export function AtualizarPainel() {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, INTERVALO_PAINEL_MS);
    return () => window.clearInterval(id);
  }, [router]);

  return null;
}
