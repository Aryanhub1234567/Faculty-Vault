import test from "node:test";
import assert from "node:assert/strict";

// Allow mock storage during unit test runs
process.env.ENABLE_MOCK_STORAGE_FALLBACK = "true";

import { prisma } from "../src/lib/db/prisma.ts";
import { RecordsService } from "../src/server/services/records.service.ts";

test("Database & RBAC: Verify academic session filtering and faculty record ownership", async () => {
  // 1. Get seeded current session
  const session2627 = await prisma.academicSession.findUnique({
    where: { name: "2026-27" },
  });
  assert.ok(session2627, "Academic session 2026-27 must exist");

  // 2. Get seeded faculty profiles
  const faculty1 = await prisma.facultyProfile.findFirst({
    where: { email: "dr.sharma@facultyvault.edu" },
  });
  const faculty2 = await prisma.facultyProfile.findFirst({
    where: { email: "prof.ananya@facultyvault.edu" },
  });
  assert.ok(faculty1);
  assert.ok(faculty2);

  // Ensure faculty1 has at least one record in this session
  let existingF1 = await prisma.record.findFirst({
    where: { facultyProfileId: faculty1.id, academicSessionId: session2627.id, deletedAt: null },
  });
  if (!existingF1) {
    const user1 = await prisma.user.findFirst({ where: { facultyProfile: { id: faculty1.id } } });
    if (user1) {
      await RecordsService.createRecord({
        userId: user1.id,
        category: "CONFERENCE",
        academicSessionId: session2627.id,
        details: {
          title: "RBAC Test Conference",
          topic: "Computer Science",
          organizer: "IEEE",
          fromDate: "2026-10-01",
          toDate: "2026-10-03",
          nationality: "NATIONAL",
        },
        files: [],
      });
    }
  }

  // 3. Query records scoped to Faculty 1
  const resultF1 = await RecordsService.getRecords({
    academicSessionId: session2627.id,
    facultyProfileId: faculty1.id,
    isAdmin: false,
  });

  assert.ok(resultF1.records.length > 0);
  resultF1.records.forEach((r) => {
    assert.equal(r.facultyProfileId, faculty1.id, "Faculty member must ONLY receive their own records");
    assert.equal(r.academicSessionId, session2627.id, "Records must match the academic session filter");
  });

  // 4. Query records scoped to Faculty 2 (should be 0 or only Faculty 2 records, NEVER Faculty 1 records)
  const resultF2 = await RecordsService.getRecords({
    academicSessionId: session2627.id,
    facultyProfileId: faculty2.id,
    isAdmin: false,
  });
  resultF2.records.forEach((r) => {
    assert.equal(r.facultyProfileId, faculty2.id, "Faculty 2 must never access Faculty 1 records");
  });

  // 5. Query records as Admin (Admin can view across all faculty)
  const resultAdmin = await RecordsService.getRecords({
    academicSessionId: session2627.id,
    isAdmin: true,
  });
  assert.ok(resultAdmin.records.length >= resultF1.records.length);
});

test("Books record creation & update: ISBN string format and Date persistence", async () => {
  const session2627 = await prisma.academicSession.findUnique({
    where: { name: "2026-27" },
  });
  const facultyUser = await prisma.user.findUnique({
    where: { email: "dr.sharma@facultyvault.edu" },
  });

  // Create Book Record
  const bookRecord = await RecordsService.createRecord({
    userId: facultyUser.id,
    category: "BOOK",
    academicSessionId: session2627.id,
    details: {
      status: "AUTHORED",
      topic: "Quantum Cryptography and Edge Networks",
      title: "Quantum Key Distribution Protocols",
      isbn: "0-201-63361-2", // Leading zero string
      date: "2026-11-01",
    },
    files: [],
  });

  assert.ok(bookRecord.id);
  assert.equal(bookRecord.bookDetails.isbn, "0-201-63361-2", "ISBN must be preserved as string");
  assert.equal(bookRecord.bookDetails.status, "AUTHORED");

  // Verify search by ISBN
  const searchResult = await RecordsService.getRecords({
    search: "0-201-63361-2",
    category: "BOOK",
    academicSessionId: session2627.id,
    isAdmin: true,
  });
  assert.ok(searchResult.records.length > 0);
  assert.equal(searchResult.records[0].bookDetails.isbn, "0-201-63361-2");

  // Test Soft Deletion
  await RecordsService.deleteRecord(bookRecord.id, undefined, true);
  const deletedCheck = await prisma.record.findUnique({
    where: { id: bookRecord.id },
  });
  assert.ok(deletedCheck.deletedAt !== null, "Soft deletion must set deletedAt timestamp");

  // Normal getRecords must exclude soft deleted records
  const afterDeleteList = await RecordsService.getRecords({
    search: "0-201-63361-2",
    category: "BOOK",
    academicSessionId: session2627.id,
    isAdmin: true,
  });
  assert.equal(afterDeleteList.records.length, 0, "Soft deleted record must not appear in queries");
});
