import { defineConfig } from "drizzle-kit";

// Migrations versionnées et réversibles, générées en CLI (cf socle §Base de données).
export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
