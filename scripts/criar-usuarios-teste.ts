import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

const IDS_REAIS = new Set([3, 6, 7, 8]);
const SENHA = process.env.TESTE_SENHA ?? "TesteEspeto1";

const TESTES = [
  {
    email: "teste.proprietario@espetinhos.local",
    nome: "TESTE Proprietário",
    perfil: "proprietario",
  },
  {
    email: "teste.gerente@espetinhos.local",
    nome: "TESTE Gerente",
    perfil: "gerente",
  },
  {
    email: "teste.operador@espetinhos.local",
    nome: "TESTE Operador PDV",
    perfil: "operador_pdv",
  },
] as const;

async function main() {
  const hash = await bcrypt.hash(SENHA, 10);
  for (const teste of TESTES) {
    const existente = await prisma.usuario.findUnique({
      where: { email: teste.email },
      select: { id: true, perfil: true, ativo: true },
    });
    if (existente && IDS_REAIS.has(existente.id)) {
      throw new Error(`Recusou alterar usuário real id ${existente.id}.`);
    }
    if (existente) {
      await prisma.usuario.update({
        where: { id: existente.id },
        data: {
          nome: teste.nome,
          perfil: teste.perfil,
          senha_hash: hash,
          senha_provisoria: true,
          ativo: true,
        },
      });
      console.log(`Atualizado ${teste.email} (id ${existente.id}, ${teste.perfil}).`);
      continue;
    }
    const criado = await prisma.usuario.create({
      data: {
        nome: teste.nome,
        email: teste.email,
        perfil: teste.perfil,
        senha_hash: hash,
        senha_provisoria: true,
        ativo: true,
      },
    });
    if (IDS_REAIS.has(criado.id)) {
      throw new Error(`Criou id real ${criado.id}; abortar.`);
    }
    console.log(`Criado ${teste.email} (id ${criado.id}, ${teste.perfil}).`);
  }
  console.log(`Senha provisória: ${SENHA}`);
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
