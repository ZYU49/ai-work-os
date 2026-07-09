import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL ?? env("DATABASE_URL"),
  },
  migrations: {
    seed: "node scripts/use-node24.cjs tsx prisma/seed.ts",
  },
});
