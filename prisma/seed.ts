import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const projects = ["Mid-States", "Family Farm & Home"];

  for (const name of projects) {
    await prisma.project.upsert({
      where: { name },
      update: {
        companyName: name,
      },
      create: {
        name,
        companyName: name,
        status: "active",
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
