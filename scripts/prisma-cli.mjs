import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^DATABASE_URL=(?:"([^"]+)"|'([^']+)'|([^#\s]+))/);
      if (match) {
        return (match[1] || match[2] || match[3] || "").trim();
      }
    }
  }
  return "";
}

const args = process.argv.slice(2);
const hasSchemaFlag = args.some((arg) => arg === "--schema" || arg.startsWith("--schema="));

let finalArgs = [...args];

if (!hasSchemaFlag) {
  const dbUrl = getDatabaseUrl();
  const isPostgres = dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://");
  const schemaFile = isPostgres ? "prisma/schema.prisma" : "prisma/schema.sqlite.prisma";
  const provider = isPostgres ? "PostgreSQL" : "SQLite";

  console.log(`[Prisma CLI] Detected datasource provider: ${provider}`);
  console.log(`[Prisma CLI] Using schema: ${schemaFile}`);
  finalArgs.push(`--schema=${schemaFile}`);
}

const result = spawnSync("npx", ["prisma", ...finalArgs], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 0);
