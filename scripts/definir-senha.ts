import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  const senha = process.argv[3] ?? "";
  const perfil = process.argv[4] ?? "operador_pdv";
  const nome = process.argv[5] ?? email;

  if (!email || !senha) {
    console.error(
      "Uso: npx tsx scripts/definir-senha.ts <email> <senha> [perfil] [nome]",
    );
    process.exit(1);
  }

  const senha_hash = await bcrypt.hash(senha, 10);
  const existente = await prisma.usuario.findUnique({ where: { email } });

  if (existente) {
    await prisma.usuario.update({
      where: { id: existente.id },
      data: { senha_hash, ativo: true },
    });
    console.log(`Senha atualizada para ${email} (perfil ${existente.perfil}).`);
  } else {
    await prisma.usuario.create({
      data: { nome, email, senha_hash, perfil, ativo: true },
    });
    console.log(`Usuário criado: ${email} (${perfil}).`);
  }
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
