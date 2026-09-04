import { getStore } from "@netlify/blobs";

export const LOGO_PUBLICA = "/api/logo";
const STORE = "empresa-logo";
const KEY = "logo";

function store() {
  return getStore({ name: STORE, consistency: "strong" });
}

export function contentTypeDaExtensao(extensao: "png" | "jpg") {
  return extensao === "png" ? "image/png" : "image/jpeg";
}

export async function salvarLogoBlob(bytes: Buffer, contentType: string) {
  const blob = new Blob([Uint8Array.from(bytes)]);
  await store().set(KEY, blob, { metadata: { contentType } });
}

export async function obterLogoBlob(): Promise<{
  data: ArrayBuffer;
  contentType: string;
} | null> {
  try {
    const resultado = await store().getWithMetadata(KEY, {
      type: "arrayBuffer",
    });
    if (!resultado?.data) return null;
    const contentType =
      typeof resultado.metadata?.contentType === "string"
        ? resultado.metadata.contentType
        : "application/octet-stream";
    return { data: resultado.data, contentType };
  } catch {
    return null;
  }
}

export async function existeLogoBlob(): Promise<boolean> {
  try {
    const meta = await store().getMetadata(KEY);
    return meta != null;
  } catch {
    return false;
  }
}
