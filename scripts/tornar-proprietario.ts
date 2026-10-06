import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!email) {
    console.error("Uso: npx tsx scripts/tornar-proprietario.ts <email>");
    process.exit(1);
  }

  const antes = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true },
  });
  if (!antes) {
    console.error("Usuário não encontrado.");
    process.exit(1);
  }

  console.log("ANTES", antes);
  const depois = await prisma.usuario.update({
    where: { email },
    data: { perfil: "proprietario" },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true },
  });
  console.log("DEPOIS", depois);
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
