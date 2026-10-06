import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { nomeExibicaoCliente } from "@/lib/cliente";
import { soDigitos } from "@/lib/documento";
import { prisma } from "@/lib/prisma";

export const TAMANHO_PAGINA_CLIENTES_PDV = 30;

export type ClientePdvLista = {
  id: number;
  nome: string;
  cpf: string | null;
  cnpj: string | null;
  telefone: string | null;
  categoria_preco: string;
};

const TRANSLATE_DE =
  "áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ";
const TRANSLATE_PARA =
  "aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC";

type LinhaClientePdv = {
  id: number;
  nome: string;
  tipo_pessoa: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cpf: string | null;
  cnpj: string | null;
  telefone: string | null;
  categoria_preco: string;
};

function escaparLike(valor: string) {
  return valor.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
}

export async function consultarClientesPdv(
  termoBruto: string,
  offsetBruto = 0,
): Promise<{ itens: ClientePdvLista[]; temMais: boolean }> {
  const offset =
    Number.isInteger(offsetBruto) && offsetBruto >= 0
      ? Math.min(offsetBruto, 10_000)
      : 0;
  const termo = String(termoBruto ?? "")
    .trim()
    .slice(0, 150);
  const termoLike = escaparLike(termo);
  const digitos = soDigitos(termo).slice(0, 20);
  const take = TAMANHO_PAGINA_CLIENTES_PDV + 1;
  const escapeLike = "\\";

  const condicoes: Prisma.Sql[] = [];
  if (termoLike.length > 0) {
    condicoes.push(
      Prisma.sql`(
        translate(lower(nome), ${TRANSLATE_DE}, ${TRANSLATE_PARA})
          LIKE ('%' || translate(lower(${termoLike}), ${TRANSLATE_DE}, ${TRANSLATE_PARA}) || '%') ESCAPE ${escapeLike}
        OR translate(lower(COALESCE(razao_social, '')), ${TRANSLATE_DE}, ${TRANSLATE_PARA})
          LIKE ('%' || translate(lower(${termoLike}), ${TRANSLATE_DE}, ${TRANSLATE_PARA}) || '%') ESCAPE ${escapeLike}
        OR translate(lower(COALESCE(nome_fantasia, '')), ${TRANSLATE_DE}, ${TRANSLATE_PARA})
          LIKE ('%' || translate(lower(${termoLike}), ${TRANSLATE_DE}, ${TRANSLATE_PARA}) || '%') ESCAPE ${escapeLike}
      )`,
    );
  }
  if (digitos.length > 0) {
    condicoes.push(
      Prisma.sql`(
        regexp_replace(COALESCE(cpf, ''), '[^0-9]', '', 'g') LIKE ('%' || ${digitos} || '%')
        OR regexp_replace(COALESCE(cnpj, ''), '[^0-9]', '', 'g') LIKE ('%' || ${digitos} || '%')
        OR regexp_replace(COALESCE(telefone, ''), '[^0-9]', '', 'g') LIKE ('%' || ${digitos} || '%')
        OR regexp_replace(COALESCE(contato_telefone, ''), '[^0-9]', '', 'g') LIKE ('%' || ${digitos} || '%')
      )`,
    );
  }

  const where =
    condicoes.length === 0
      ? Prisma.sql`TRUE`
      : Prisma.sql`(${Prisma.join(condicoes, " OR ")})`;

  const linhas = await prisma.$queryRaw<LinhaClientePdv[]>`
    SELECT
      id,
      nome,
      tipo_pessoa,
      razao_social,
      nome_fantasia,
      cpf,
      cnpj,
      COALESCE(NULLIF(BTRIM(telefone), ''), NULLIF(BTRIM(contato_telefone), '')) AS telefone,
      categoria_preco
    FROM cliente
    WHERE ${where}
    ORDER BY
      translate(
        lower(
          CASE
            WHEN tipo_pessoa = 'juridica'
              THEN COALESCE(NULLIF(BTRIM(nome_fantasia), ''), NULLIF(BTRIM(razao_social), ''), nome)
            ELSE nome
          END
        ),
        ${TRANSLATE_DE},
        ${TRANSLATE_PARA}
      ) ASC,
      id ASC
    LIMIT ${take} OFFSET ${offset}
  `;

  const temMais = linhas.length > TAMANHO_PAGINA_CLIENTES_PDV;
  const pagina = temMais
    ? linhas.slice(0, TAMANHO_PAGINA_CLIENTES_PDV)
    : linhas;

  return {
    temMais,
    itens: pagina.map((cliente) => ({
      id: cliente.id,
      nome: nomeExibicaoCliente(cliente),
      cpf: cliente.cpf,
      cnpj: cliente.cnpj,
      telefone: cliente.telefone,
      categoria_preco: cliente.categoria_preco,
    })),
  };
}
