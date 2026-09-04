import { prisma } from "@/lib/prisma";
import { temAcessoMultiplo } from "@/lib/permissoes";

export type FaqResultado = {
  id: number;
  titulo: string;
  resposta: string;
  rota_destino: string;
};

const SELECT_FAQ = {
  id: true,
  titulo: true,
  palavras_chave: true,
  resposta: true,
  rota_destino: true,
  modulo_chave: true,
  ordem: true,
} as const;

type FaqLinha = {
  id: number;
  titulo: string;
  palavras_chave: string | null;
  resposta: string;
  rota_destino: string;
  modulo_chave: string | null;
  ordem: number;
};

function visivel(
  item: { modulo_chave: string | null },
  acessos: Record<string, boolean>,
) {
  if (!item.modulo_chave) return true;
  return Boolean(acessos[item.modulo_chave]);
}

function ranque(item: FaqLinha, termo: string) {
  const t = termo.toLowerCase();
  if (item.titulo.toLowerCase().includes(t)) return 0;
  if ((item.palavras_chave ?? "").toLowerCase().includes(t)) return 1;
  return 2;
}

function paraResultado(item: FaqLinha): FaqResultado {
  return {
    id: item.id,
    titulo: item.titulo,
    resposta: item.resposta,
    rota_destino: item.rota_destino,
  };
}

export async function buscarFaq(
  usuarioId: number,
  consulta: string,
): Promise<FaqResultado[]> {
  const termo = consulta.trim();
  const acessos = await temAcessoMultiplo(usuarioId);

  if (!termo) {
    const sugestoes = await prisma.faq_item.findMany({
      where: { ativo: true },
      orderBy: [{ ordem: "asc" }, { id: "asc" }],
      select: SELECT_FAQ,
    });
    return sugestoes.filter((item) => visivel(item, acessos)).slice(0, 5).map(paraResultado);
  }

  const itens = await prisma.faq_item.findMany({
    where: {
      ativo: true,
      OR: [
        { titulo: { contains: termo, mode: "insensitive" } },
        { palavras_chave: { contains: termo, mode: "insensitive" } },
        { resposta: { contains: termo, mode: "insensitive" } },
      ],
    },
    select: SELECT_FAQ,
  });

  return itens
    .filter((item) => visivel(item, acessos))
    .sort((a, b) => {
      const diff = ranque(a, termo) - ranque(b, termo);
      if (diff !== 0) return diff;
      if (a.ordem !== b.ordem) return a.ordem - b.ordem;
      return a.id - b.id;
    })
    .slice(0, 20)
    .map(paraResultado);
}
