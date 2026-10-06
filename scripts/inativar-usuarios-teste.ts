import "dotenv/config";
import { prisma } from "../lib/prisma";

const IDS_REAIS = new Set([3, 6, 7, 8]);
const EMAILS_TESTE = [
  "teste.proprietario@espetinhos.local",
  "teste.gerente@espetinhos.local",
  "teste.operador@espetinhos.local",
];

async function main() {
  const registros = await prisma.usuario.findMany({
    where: { email: { in: EMAILS_TESTE } },
    select: { id: true, email: true, ativo: true },
  });
  for (const usuario of registros) {
    if (IDS_REAIS.has(usuario.id)) {
      throw new Error(`Recusou inativar usuário real id ${usuario.id}.`);
    }
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ativo: false },
    });
    console.log(`Inativado ${usuario.email} (id ${usuario.id}).`);
  }
  if (registros.length === 0) {
    console.log("Nenhum usuário de teste encontrado.");
  }
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
