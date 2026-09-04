import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const senha = process.env.SUPER_ADMIN_PASSWORD ?? "";

  if (!email || !senha) {
    throw new Error(
      "Defina SUPER_ADMIN_EMAIL e SUPER_ADMIN_PASSWORD no .env antes do seed.",
    );
  }

  const senha_hash = await bcrypt.hash(senha, 10);
  const existente = await prisma.usuario.findUnique({ where: { email } });

  if (existente) {
    await prisma.usuario.update({
      where: { id: existente.id },
      data: {
        perfil: "super_admin",
        senha_hash,
        ativo: true,
        senha_provisoria: false,
      },
    });
    console.log(`Super admin atualizado: ${email}`);
    return;
  }

  await prisma.usuario.create({
    data: {
      nome: "Super Admin",
      email,
      senha_hash,
      perfil: "super_admin",
      ativo: true,
      senha_provisoria: false,
    },
  });
  console.log(`Super admin criado: ${email}`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
