import { prisma } from "@/lib/prisma";
import { temAcessoMultiplo } from "@/lib/permissoes";
import {
  CATALOGO_AJUDA,
  rotasDoItemCatalogo,
} from "@/lib/catalogo-ajuda";
import {
  filtrarItensAjuda,
  type ItemBuscaAjuda,
} from "@/lib/catalogo-busca";

export type FaqResultado = {
  id: string;
  titulo: string;
  resposta: string;
  rota_destino: string;
};

function rotaBase(rota: string) {
  return rota.split("?")[0] ?? rota;
}

function rotasDoCatalogo() {
  const rotas = new Set<string>();
  for (const item of CATALOGO_AJUDA) {
    for (const rota of rotasDoItemCatalogo(item)) {
      rotas.add(rotaBase(rota));
    }
  }
  return rotas;
}

function extraParaBusca(extra: {
  id: number;
  titulo: string;
  palavras_chave: string | null;
  resposta: string;
  rota_destino: string;
  modulo_chave: string | null;
  ordem: number;
}): ItemBuscaAjuda {
  const palavras = (extra.palavras_chave ?? "")
    .split(",")
    .map((parte) => parte.trim())
    .filter(Boolean);
  return {
    id: `faq-${extra.id}`,
    titulo: extra.titulo,
    descricao: extra.resposta,
    rota: extra.rota_destino,
    modulo: extra.modulo_chave,
    palavrasChave: palavras,
    sinonimos: [],
    ordem: 10_000 + extra.ordem,
  };
}

function paraResultado(item: ItemBuscaAjuda): FaqResultado {
  return {
    id: item.id,
    titulo: item.titulo,
    resposta: item.descricao,
    rota_destino: item.rota,
  };
}

export async function buscarFaq(
  usuarioId: number,
  consulta: string,
): Promise<FaqResultado[]> {
  const [acessos, usuario, extras] = await Promise.all([
    temAcessoMultiplo(usuarioId),
    prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { perfil: true },
    }),
    prisma.faq_item.findMany({
      where: { ativo: true },
      select: {
        id: true,
        titulo: true,
        palavras_chave: true,
        resposta: true,
        rota_destino: true,
        modulo_chave: true,
        ordem: true,
      },
    }),
  ]);

  const perfil = usuario?.perfil ?? "";
  const cobertas = rotasDoCatalogo();
  const extrasBusca = extras
    .filter((extra) => !cobertas.has(rotaBase(extra.rota_destino)))
    .map(extraParaBusca);

  return filtrarItensAjuda(
    [...CATALOGO_AJUDA, ...extrasBusca],
    consulta,
    acessos,
    perfil,
  ).map(paraResultado);
}
