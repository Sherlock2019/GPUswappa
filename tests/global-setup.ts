import { execSync } from "child_process";
import { loadTestEnv } from "./env";

/** Recreates the test database schema from migrations, then loads reference data. */
export default async function setup() {
  loadTestEnv();
  if (!/gpuswapper_test/.test(process.env.DATABASE_URL ?? "")) throw new Error("Test DATABASE_URL must point at the *_test database");
  execSync("npx prisma migrate reset --force --skip-seed --skip-generate", { stdio: "pipe", env: process.env });
  const { PrismaClient } = await import("@prisma/client");
  const { seedReference } = await import("../prisma/seed-reference");
  const prisma = new PrismaClient();
  await seedReference(prisma);
  await prisma.$disconnect();
}
