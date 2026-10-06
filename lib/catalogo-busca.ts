import type {
  ItemBuscaAjuda,
  PerfilBuscaAjuda,
} from "@/lib/catalogo-ajuda";

export type { ItemBuscaAjuda, PerfilBuscaAjuda };

export const LIMITE_RESULTADOS_AJUDA = 20;
export const LIMITE_SUGESTOES_AJUDA = 8;

const STOPWORDS = new Set([
  "a",
  "as",
  "o",
  "os",
  "um",
  "uma",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "ou",
  "para",
  "no",
  "na",
  "em",
  "com",
]);

export function normalizarBusca(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/g, "c");
}

export function tokenizarBusca(texto: string) {
  return normalizarBusca(texto)
    .split(/[^a-z0-9+]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

export function distanciaLevenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  const atual = Array.from({ length: b.length + 1 }, () => 0);
  for (let i = 1; i <= a.length; i += 1) {
    atual[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min(
        atual[j - 1] + 1,
        anterior[j] + 1,
        anterior[j - 1] + custo,
      );
    }
    for (let j = 0; j <= b.length; j += 1) anterior[j] = atual[j];
  }
  return anterior[b.length];
}

function maximoErro(token: string) {
  return token.length >= 6 ? 2 : 1;
}

function tokenCasaComPalavra(token: string, palavra: string) {
  if (palavra.includes(token)) return true;
  if (token.length >= 4 && token.includes(palavra) && palavra.length >= 4) {
    return true;
  }
  const max = maximoErro(token);
  if (Math.abs(palavra.length - token.length) > max) return false;
  return distanciaLevenshtein(token, palavra) <= max;
}

export function campoAceitaTokens(campo: string, tokens: string[]) {
  return distanciaCampo(campo, tokens) != null;
}

function distanciaTokenNoCampo(token: string, campo: string) {
  const texto = normalizarBusca(campo);
  if (texto.includes(token)) return 0;
  const palavras = tokenizarBusca(campo);
  let melhor: number | null = null;
  for (const palavra of palavras) {
    if (palavra.includes(token)) return 0;
    if (token.length >= 4 && token.includes(palavra) && palavra.length >= 4) {
      return 0;
    }
    if (!tokenCasaComPalavra(token, palavra)) continue;
    const dist = distanciaLevenshtein(token, palavra);
    if (melhor == null || dist < melhor) melhor = dist;
  }
  return melhor;
}

function distanciaCampo(campo: string, tokens: string[]) {
  if (tokens.length === 0) return null;
  let total = 0;
  for (const token of tokens) {
    const dist = distanciaTokenNoCampo(token, campo);
    if (dist == null) return null;
    total += dist;
  }
  return total;
}

export type RanqueBuscaAjuda = {
  bucket: number;
  dist: number;
};

export function itemAjudaVisivel(
  item: ItemBuscaAjuda,
  acessos: Record<string, boolean>,
  perfil: PerfilBuscaAjuda,
) {
  if (item.perfilMinimo === "super_admin") return perfil === "super_admin";
  if (item.perfilMinimo === "proprietario") {
    return perfil === "super_admin" || perfil === "proprietario";
  }
  if (item.perfilMinimo === "gerente") {
    return (
      perfil === "super_admin" ||
      perfil === "proprietario" ||
      perfil === "gerente"
    );
  }
  if (item.modulo == null) return true;
  const modulos = Array.isArray(item.modulo) ? item.modulo : [item.modulo];
  return modulos.some((modulo) => Boolean(acessos[modulo]));
}

export function ranqueItemAjuda(
  item: ItemBuscaAjuda,
  tokens: string[],
): RanqueBuscaAjuda | null {
  if (tokens.length === 0) return { bucket: 0, dist: item.ordem };
  const chaves = [...item.palavrasChave, ...item.sinonimos].join(" ");
  const titulo = distanciaCampo(item.titulo, tokens);
  if (titulo != null) return { bucket: 0, dist: titulo };
  const palavras = distanciaCampo(chaves, tokens);
  if (palavras != null) return { bucket: 1, dist: palavras };
  const descricao = distanciaCampo(item.descricao, tokens);
  if (descricao != null) return { bucket: 2, dist: descricao };
  return null;
}

export function filtrarItensAjuda(
  itens: readonly ItemBuscaAjuda[],
  consulta: string,
  acessos: Record<string, boolean>,
  perfil: PerfilBuscaAjuda,
) {
  const visiveis = itens.filter((item) =>
    itemAjudaVisivel(item, acessos, perfil),
  );
  const termo = consulta.trim();
  if (!termo) {
    return [...visiveis]
      .sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, "pt-BR"))
      .slice(0, LIMITE_SUGESTOES_AJUDA);
  }

  const tokens = tokenizarBusca(termo);
  if (tokens.length === 0) {
    return visiveis.slice(0, LIMITE_SUGESTOES_AJUDA);
  }

  return visiveis
    .map((item) => {
      const ranque = ranqueItemAjuda(item, tokens);
      return ranque == null ? null : { item, ranque };
    })
    .filter(
      (linha): linha is { item: ItemBuscaAjuda; ranque: RanqueBuscaAjuda } =>
        linha != null,
    )
    .sort((a, b) => {
      if (a.ranque.bucket !== b.ranque.bucket) {
        return a.ranque.bucket - b.ranque.bucket;
      }
      if (a.ranque.dist !== b.ranque.dist) return a.ranque.dist - b.ranque.dist;
      if (a.item.ordem !== b.item.ordem) return a.item.ordem - b.item.ordem;
      return a.item.titulo.localeCompare(b.item.titulo, "pt-BR");
    })
    .slice(0, LIMITE_RESULTADOS_AJUDA)
    .map((linha) => linha.item);
}
