import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

// Load .env if present
function loadEnv() {
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

loadEnv();

// Safety check: Prevent running demo seed in production environment
const nodeEnv = (process.env.NODE_ENV || "").trim().toLowerCase();
if (nodeEnv === "production") {
  console.error("❌ Refusing to run demo seed script when NODE_ENV is 'production'.");
  console.error("Demo seeding creates mock accounts, fabricated records, and test sync jobs.");
  console.error("For production database initialization and bootstrapping, run 'npm run db:init:prod'.");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Faculty Vault database seed...");

  // 1. Create or get Default Institute
  const institute = await prisma.institute.upsert({
    where: { code: "NITE-01" },
    update: {
      name: "Apex Institute of Technology & Engineering",
    },
    create: {
      name: "Apex Institute of Technology & Engineering",
      code: "NITE-01",
    },
  });
  console.log(`✓ Institute initialized: ${institute.name} (${institute.code})`);

  // 2. Academic Sessions (Section 5)
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

  const sessions = {};
  for (const name of sessionNames) {
    const isCurrent = name === "2026-27";
    const startYear = parseInt(name.split("-")[0], 10);
    const session = await prisma.academicSession.upsert({
      where: { name },
      update: {
        isCurrent,
        isActive: true,
      },
      create: {
        name,
        isCurrent,
        isActive: true,
        startDate: new Date(`${startYear}-07-01T00:00:00.000Z`),
        endDate: new Date(`${startYear + 1}-06-30T23:59:59.999Z`),
      },
    });
    sessions[name] = session;
  }
  console.log(`✓ Initialized ${sessionNames.length} academic sessions (Current: 2026-27)`);

  // 3. Admin User
  const adminEmail = "admin@facultyvault.edu";
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {}, // Preserve existing role, accountStatus, and name to prevent unexpected reset
    create: {
      name: "Dean Academic Affairs",
      email: adminEmail,
      role: "ADMIN",
      accountStatus: "APPROVED",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
  });

  await prisma.facultyProfile.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      instituteId: institute.id,
      facultyId: "ADM001",
      name: "Dr. Alok Verma",
      email: adminEmail,
      department: "Administration & Computing",
      designation: "Dean & Senior Professor",
      phone: "+91 98765 43210",
    },
  });
  console.log(`✓ Admin account created: ${adminEmail}`);

  // 4. Primary Faculty User (Dr. Rajesh Sharma)
  const facultyEmail = "dr.sharma@facultyvault.edu";
  const facultyUser = await prisma.user.upsert({
    where: { email: facultyEmail },
    update: {}, // Preserve existing role and accountStatus
    create: {
      name: "Dr. Rajesh Sharma",
      email: facultyEmail,
      role: "FACULTY",
      accountStatus: "APPROVED",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    },
  });

  const facultyProfile = await prisma.facultyProfile.upsert({
    where: { userId: facultyUser.id },
    update: {},
    create: {
      userId: facultyUser.id,
      instituteId: institute.id,
      facultyId: "F001",
      name: "Dr. Rajesh Sharma",
      email: facultyEmail,
      department: "Computer Science & Engineering",
      designation: "Professor & Head of Department",
      phone: "+91 98112 34567",
    },
  });
  console.log(`✓ Faculty account created: ${facultyEmail} (${facultyProfile.facultyId})`);

  // 5. Secondary Faculty User (Prof. Ananya Roy)
  const faculty2Email = "prof.ananya@facultyvault.edu";
  const faculty2User = await prisma.user.upsert({
    where: { email: faculty2Email },
    update: {}, // Preserve existing role and accountStatus
    create: {
      name: "Prof. Ananya Roy",
      email: faculty2Email,
      role: "FACULTY",
      accountStatus: "APPROVED",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    },
  });

  const faculty2Profile = await prisma.facultyProfile.upsert({
    where: { userId: faculty2User.id },
    update: {},
    create: {
      userId: faculty2User.id,
      instituteId: institute.id,
      facultyId: "F002",
      name: "Prof. Ananya Roy",
      email: faculty2Email,
      department: "Electronics & Communication",
      designation: "Associate Professor",
      phone: "+91 98223 45678",
    },
  });

  // 6. Pending Faculty (For Admin Approval testing)
  const pendingEmail = "dr.mehta@facultyvault.edu";
  const pendingUser = await prisma.user.upsert({
    where: { email: pendingEmail },
    update: {},
    create: {
      name: "Dr. Vikram Mehta",
      email: pendingEmail,
      role: "FACULTY",
      accountStatus: "PENDING",
    },
  });

  await prisma.facultyProfile.upsert({
    where: { userId: pendingUser.id },
    update: {},
    create: {
      userId: pendingUser.id,
      instituteId: institute.id,
      facultyId: "F003",
      name: "Dr. Vikram Mehta",
      email: pendingEmail,
      department: "Mechanical Engineering",
      designation: "Assistant Professor",
      phone: "+91 98334 56789",
    },
  });
  console.log(`✓ Pending faculty onboarding registration created for testing approvals: ${pendingEmail}`);

  // 7. Seed Records for 2026-27 session (Dr. Rajesh Sharma)
  const currentSession = sessions["2026-27"];

  // Category 1: Conference
  const confRecord = await prisma.record.upsert({
    where: { recordCode: "REC-CONF-1001" },
    update: {},
    create: {
      recordCode: "REC-CONF-1001",
      facultyProfileId: facultyProfile.id,
      academicSessionId: currentSession.id,
      category: "CONFERENCE",
      createdById: facultyUser.id,
      recordFolderDriveId: "mock_drive_folder_conf_1001",
      recordFolderWebViewLink: "https://drive.google.com/drive/folders/mock_conf_1001",
      conferenceDetails: {
        create: {
          title: "Neural Architecture Search for Distributed Edge Intelligence",
          topic: "Artificial Intelligence & Edge Computing",
          organizer: "IEEE Computer Society & ACM India",
          fromDate: new Date("2026-08-14T09:00:00.000Z"),
          toDate: new Date("2026-08-16T18:00:00.000Z"),
          nationality: "INTERNATIONAL",
        },
      },
      attachments: {
        create: [
          {
            fileName: "Paper_NAS_Edge_Intelligence.pdf",
            mimeType: "application/pdf",
            fileSize: 2450000,
            driveFileId: "mock_file_conf_paper",
            webViewLink: "https://drive.google.com/file/d/mock_conf_paper/view",
          },
          {
            fileName: "Certificate_of_Presentation.pdf",
            mimeType: "application/pdf",
            fileSize: 850000,
            driveFileId: "mock_file_conf_cert",
            webViewLink: "https://drive.google.com/file/d/mock_conf_cert/view",
          },
        ],
      },
      sheetSyncJobs: {
        create: {
          category: "CONFERENCE",
          action: "CREATE",
          status: "SUCCEEDED",
          attempts: 1,
          syncedAt: new Date(),
        },
      },
    },
  });

  // Category 2: Patent
  const patentRecord = await prisma.record.upsert({
    where: { recordCode: "REC-PAT-2001" },
    update: {},
    create: {
      recordCode: "REC-PAT-2001",
      facultyProfileId: facultyProfile.id,
      academicSessionId: currentSession.id,
      category: "PATENT",
      createdById: facultyUser.id,
      recordFolderDriveId: "mock_drive_folder_pat_2001",
      recordFolderWebViewLink: "https://drive.google.com/drive/folders/mock_pat_2001",
      patentDetails: {
        create: {
          type: "UTILITY",
          title: "Zero-Latency Cryptographic Key Exchange for IoT Gateways",
          dateOfApply: new Date("2025-11-10T00:00:00.000Z"),
          dateOfIssue: new Date("2026-09-22T00:00:00.000Z"),
          status: "GRANT",
        },
      },
      attachments: {
        create: [
          {
            fileName: "Patent_Grant_Certificate_IndianPatentOffice.pdf",
            mimeType: "application/pdf",
            fileSize: 3120000,
            driveFileId: "mock_file_patent_grant",
            webViewLink: "https://drive.google.com/file/d/mock_patent_grant/view",
          },
        ],
      },
      sheetSyncJobs: {
        create: {
          category: "PATENT",
          action: "CREATE",
          status: "SUCCEEDED",
          attempts: 1,
          syncedAt: new Date(),
        },
      },
    },
  });

  // Category 3: FDP
  const fdpRecord = await prisma.record.upsert({
    where: { recordCode: "REC-FDP-3001" },
    update: {},
    create: {
      recordCode: "REC-FDP-3001",
      facultyProfileId: facultyProfile.id,
      academicSessionId: currentSession.id,
      category: "FDP",
      createdById: facultyUser.id,
      recordFolderDriveId: "mock_drive_folder_fdp_3001",
      recordFolderWebViewLink: "https://drive.google.com/drive/folders/mock_fdp_3001",
      fdpDetails: {
        create: {
          topic: "Advanced Quantum Computing Algorithms & Hardware Architectures",
          organizer: "IIT Bombay & AICTE ATAL Academy",
          fromDate: new Date("2026-07-06T09:00:00.000Z"),
          toDate: new Date("2026-07-17T17:30:00.000Z"),
        },
      },
      attachments: {
        create: [
          {
            fileName: "AICTE_ATAL_FDP_Completion_Certificate.pdf",
            mimeType: "application/pdf",
            fileSize: 1120000,
            driveFileId: "mock_file_fdp_cert",
            webViewLink: "https://drive.google.com/file/d/mock_fdp_cert/view",
          },
        ],
      },
      sheetSyncJobs: {
        create: {
          category: "FDP",
          action: "CREATE",
          status: "SUCCEEDED",
          attempts: 1,
          syncedAt: new Date(),
        },
      },
    },
  });

  // Category 4: Research Articles
  const researchRecord = await prisma.record.upsert({
    where: { recordCode: "REC-RES-4001" },
    update: {},
    create: {
      recordCode: "REC-RES-4001",
      facultyProfileId: facultyProfile.id,
      academicSessionId: currentSession.id,
      category: "RESEARCH_ARTICLE",
      createdById: facultyUser.id,
      recordFolderDriveId: "mock_drive_folder_res_4001",
      recordFolderWebViewLink: "https://drive.google.com/drive/folders/mock_res_4001",
      researchArticleDetails: {
        create: {
          title: "Fault-Tolerant Consensus in Asynchronous Byzantine Networks",
          publisher: "IEEE Transactions on Dependable and Secure Computing",
          indexing: "SCI",
        },
      },
      attachments: {
        create: [
          {
            fileName: "IEEE_TDSC_Published_Manuscript.pdf",
            mimeType: "application/pdf",
            fileSize: 4200000,
            driveFileId: "mock_file_research_manuscript",
            webViewLink: "https://drive.google.com/file/d/mock_research_manuscript/view",
          },
        ],
      },
      sheetSyncJobs: {
        create: {
          category: "RESEARCH_ARTICLE",
          action: "CREATE",
          status: "SUCCEEDED",
          attempts: 1,
          syncedAt: new Date(),
        },
      },
    },
  });

  // Category 5: Book Chapters
  const chapterRecord = await prisma.record.upsert({
    where: { recordCode: "REC-CHAP-5001" },
    update: {},
    create: {
      recordCode: "REC-CHAP-5001",
      facultyProfileId: facultyProfile.id,
      academicSessionId: currentSession.id,
      category: "BOOK_CHAPTER",
      createdById: facultyUser.id,
      recordFolderDriveId: "mock_drive_folder_chap_5001",
      recordFolderWebViewLink: "https://drive.google.com/drive/folders/mock_chap_5001",
      bookChapterDetails: {
        create: {
          title: "Reinforcement Learning in Smart Grid Load Balancing",
          topic: "Advances in Intelligent Clean Energy Systems",
          date: new Date("2026-08-20T00:00:00.000Z"),
        },
      },
      attachments: {
        create: [
          {
            fileName: "Springer_Chapter_RL_Smart_Grid.pdf",
            mimeType: "application/pdf",
            fileSize: 1890000,
            driveFileId: "mock_file_chap_pdf",
            webViewLink: "https://drive.google.com/file/d/mock_chap_pdf/view",
          },
        ],
      },
      sheetSyncJobs: {
        create: {
          category: "BOOK_CHAPTER",
          action: "CREATE",
          status: "SUCCEEDED",
          attempts: 1,
          syncedAt: new Date(),
        },
      },
    },
  });

  // Category 6: Books (with Status, Topic, Title, ISBN string, Date)
  const bookRecord = await prisma.record.upsert({
    where: { recordCode: "REC-BOOK-6001" },
    update: {},
    create: {
      recordCode: "REC-BOOK-6001",
      facultyProfileId: facultyProfile.id,
      academicSessionId: currentSession.id,
      category: "BOOK",
      createdById: facultyUser.id,
      recordFolderDriveId: "mock_drive_folder_book_6001",
      recordFolderWebViewLink: "https://drive.google.com/drive/folders/mock_book_6001",
      bookDetails: {
        create: {
          status: "AUTHORED",
          topic: "Cloud-Native Microservices Architecture & Orchestration",
          title: "Architecting Modern Scalable Distributed Systems",
          isbn: "978-0-13-468599-1", // Stored as string to preserve format and leading zeros
          date: new Date("2026-09-15T00:00:00.000Z"),
        },
      },
      attachments: {
        create: [
          {
            fileName: "Book_Cover_and_Front_Matter.pdf",
            mimeType: "application/pdf",
            fileSize: 5120000,
            driveFileId: "mock_file_book_cover",
            webViewLink: "https://drive.google.com/file/d/mock_book_cover/view",
          },
        ],
      },
      sheetSyncJobs: {
        create: {
          category: "BOOK",
          action: "CREATE",
          status: "SUCCEEDED",
          attempts: 1,
          syncedAt: new Date(),
        },
      },
    },
  });

  // Also seed an audit log idempotently
  const existingAuditLog = await prisma.auditLog.findFirst({
    where: {
      userId: facultyUser.id,
      action: "RECORD_CREATE",
      entityType: "Record",
      entityId: bookRecord.id,
    },
  });

  if (!existingAuditLog) {
    await prisma.auditLog.create({
      data: {
        userId: facultyUser.id,
        action: "RECORD_CREATE",
        entityType: "Record",
        entityId: bookRecord.id,
        details: JSON.stringify({
          category: "BOOK",
          title: "Architecting Modern Scalable Distributed Systems",
          isbn: "978-0-13-468599-1",
        }),
        ipAddress: "127.0.0.1",
      },
    });
    console.log("✓ Sample audit log initialized");
  } else {
    console.log("✓ Sample audit log already exists (skipped duplicate creation)");
  }

  console.log(`✓ Seeded records for all 6 categories (Conference, Patent, FDP, Research, Chapter, Books)`);
  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
