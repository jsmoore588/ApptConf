import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Keep Prisma aligned with the Next.js app by loading .env.local first.
loadEnv({ path: ".env.local" });
loadEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
