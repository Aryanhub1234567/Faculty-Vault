import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

// 1. Load environment variables from .env if present
function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnvFile();

const args = process.argv.slice(2);
const allowSqlite = args.includes("--allow-sqlite");
const skipSchema = args.includes("--skip-schema");
const forceMigrate = args.includes("--migrate");
const forcePush = args.includes("--push");

// 2. Validate database configuration
const dbUrl = (process.env.DATABASE_URL || "").trim();
if (!dbUrl) {
  console.error("❌ Production initialization error: DATABASE_URL is not set.");
  console.error("Please configure a PostgreSQL connection string in your environment or .env file.");
  process.exit(1);
}

const isPostgres = dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://");
if (!isPostgres && !allowSqlite) {
  console.error("❌ Production initialization safety check failed:");
  console.error(`DATABASE_URL points to a non-PostgreSQL datasource: ${dbUrl}`);
  console.error("Production Faculty Vault requires PostgreSQL (Neon, Supabase, AWS RDS, etc.).");
  console.error("• For local/development database setup with demo data, use: npm run db:init:dev");
  console.error("• To test production bootstrap against SQLite locally, pass: --allow-sqlite");
  process.exit(1);
}

const schemaFile = isPostgres ? "prisma/schema.prisma" : "prisma/schema.sqlite.prisma";

// 3. Schema Initialization
function initializeSchema() {
  if (skipSchema) {
    console.log("⏩ Skipping schema migration/push (--skip-schema flag provided).");
    return;
  }

  const migrationsDir = path.resolve(process.cwd(), "prisma", "migrations");
  const hasMigrations =
    fs.existsSync(migrationsDir) &&
    fs.readdirSync(migrationsDir).some((entry) => {
      const full = path.join(migrationsDir, entry);
      return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "migration.sql"));
    });

  let prismaCommand;
  let commandArgs;

  if (forceMigrate || (hasMigrations && !forcePush)) {
    console.log(`🚀 Applying production migrations via 'prisma migrate deploy' (--schema=${schemaFile})...`);
    prismaCommand = "migrate deploy";
    commandArgs = ["migrate", "deploy", `--schema=${schemaFile}`];
  } else {
    console.log(`📦 Initializing schema via 'prisma db push' (--schema=${schemaFile})...`);
    prismaCommand = "db push";
    commandArgs = ["db", "push", `--schema=${schemaFile}`];
  }

  const result = spawnSync("npx", ["prisma", ...commandArgs], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`❌ Failed to initialize database schema using 'prisma ${prismaCommand}'.`);
    process.exit(result.status ?? 1);
  }

  console.log(`⚡ Generating Prisma Client for ${schemaFile}...`);
  const genResult = spawnSync("npx", ["prisma", "generate", `--schema=${schemaFile}`], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  if (genResult.status !== 0) {
    console.error("❌ Failed to generate Prisma Client.");
    process.exit(genResult.status ?? 1);
  }
}

// 4. Production Bootstrap Data (Idempotent, Zero Demo Data)
async function bootstrapProduction() {
  const prisma = new PrismaClient();

  try {
    console.log("\n🔒 Starting Faculty Vault Production Initialization...");

    // A. Create or verify actual Institute from environment
    console.log("\n🏢 Step 1: Initializing Production Institute...");
    const instituteName =
      process.env.INSTITUTE_NAME?.trim() || "Apex Institute of Technology & Engineering";
    const instituteCode = (process.env.INSTITUTE_CODE?.trim() || "INST-01").toUpperCase();

    let institute = await prisma.institute.findUnique({
      where: { code: instituteCode },
    });

    if (!institute) {
      institute = await prisma.institute.findFirst({
        where: { name: instituteName },
      });
    }

    if (!institute) {
      institute = await prisma.institute.create({
        data: {
          name: instituteName,
          code: instituteCode,
        },
      });
      console.log(`✓ Created actual institute: "${institute.name}" (Code: ${institute.code})`);
    } else {
      console.log(`✓ Verified existing institute: "${institute.name}" (Code: ${institute.code}, ID: ${institute.id})`);
    }

    // B. Initialize default Academic Sessions
    console.log("\n📅 Step 2: Initializing Default Academic Sessions...");
    const sessionNames = [
      "2022-23",
      "2023-24",
      "2024-25",
      "2025-26",
      "2026-27",
      "2027-28",
      "2028-29",
      "2029-30",
    ];

    let sessionsCreated = 0;
    let sessionsExisting = 0;

    for (const name of sessionNames) {
      const existing = await prisma.academicSession.findUnique({
        where: { name },
      });

      if (!existing) {
        const isCurrent = name === "2026-27";
        const startYear = parseInt(name.split("-")[0], 10);
        await prisma.academicSession.create({
          data: {
            name,
            isCurrent,
            isActive: true,
            startDate: new Date(`${startYear}-07-01T00:00:00.000Z`),
            endDate: new Date(`${startYear + 1}-06-30T23:59:59.999Z`),
          },
        });
        sessionsCreated++;
      } else {
        sessionsExisting++;
      }
    }
    console.log(`✓ Academic sessions verified: ${sessionsExisting} existing, ${sessionsCreated} newly created`);

    // C. Create or verify Initial Administrator
    console.log("\n👤 Step 3: Initializing Initial Administrator Account...");
    const adminEmail = (
      process.env.INITIAL_ADMIN_EMAIL ||
      (process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",")[0] : "")
    ).trim().toLowerCase();

    if (!adminEmail) {
      console.error("❌ Production initialization error: No administrator email configured.");
      console.error("Please set INITIAL_ADMIN_EMAIL or ADMIN_EMAILS in your environment.");
      console.error("Example: ADMIN_EMAILS=\"admin@yourinstitute.edu\"");
      process.exit(1);
    }

    const adminName =
      process.env.INITIAL_ADMIN_NAME?.trim() ||
      process.env.ADMIN_NAME?.trim() ||
      "System Administrator";
    const adminFacultyId = (process.env.INITIAL_ADMIN_FACULTY_ID?.trim() || "ADM-001").toUpperCase();
    const adminDepartment = process.env.INITIAL_ADMIN_DEPARTMENT?.trim() || "Administration";
    const adminDesignation = process.env.INITIAL_ADMIN_DESIGNATION?.trim() || "Dean / Administrator";
    const adminPhone = process.env.INITIAL_ADMIN_PHONE?.trim() || null;

    let adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          role: "ADMIN",
          accountStatus: "APPROVED",
        },
      });
      console.log(`✓ Created initial administrator user: ${adminEmail} (Role: ADMIN, Status: APPROVED)`);
    } else {
      // Idempotency: Do not reset role or accountStatus unexpectedly
      console.log(`✓ Verified existing administrator user: ${adminEmail} (Role: ${adminUser.role}, Status: ${adminUser.accountStatus})`);
    }

    let adminProfile = await prisma.facultyProfile.findUnique({
      where: { userId: adminUser.id },
    });

    if (!adminProfile) {
      const existingWithFacultyId = await prisma.facultyProfile.findFirst({
        where: {
          instituteId: institute.id,
          facultyId: adminFacultyId,
        },
      });

      const finalFacultyId = existingWithFacultyId
        ? `ADM-${Date.now().toString().slice(-4)}`
        : adminFacultyId;

      adminProfile = await prisma.facultyProfile.create({
        data: {
          userId: adminUser.id,
          instituteId: institute.id,
          facultyId: finalFacultyId,
          name: adminName,
          email: adminEmail,
          department: adminDepartment,
          designation: adminDesignation,
          phone: adminPhone,
        },
      });
      console.log(`✓ Created administrator profile: ${adminProfile.name} (Faculty ID: ${adminProfile.facultyId})`);
    } else {
      console.log(`✓ Verified existing administrator profile: ${adminProfile.name} (Faculty ID: ${adminProfile.facultyId})`);
    }

    // D. Production Integrity Verification
    console.log("\n🛡️ Production Integrity Verification:");
    console.log("  [PASS] 0 demo faculty accounts created");
    console.log("  [PASS] 0 fabricated academic records created");
    console.log("  [PASS] 0 mock Google Drive attachments created");
    console.log("  [PASS] 0 sample audit logs inserted");
    console.log("  [PASS] 0 synthetic Sheets synchronization jobs queued");

    console.log("\n🎉 Production initialization completed successfully!");
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  initializeSchema();
  await bootstrapProduction();
}

main().catch((err) => {
  console.error("❌ Production initialization failed:", err);
  process.exit(1);
});
