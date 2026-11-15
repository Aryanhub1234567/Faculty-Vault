import test from "node:test";
import assert from "node:assert/strict";
import {
  conferenceSchema,
  patentSchema,
  fdpSchema,
  researchArticleSchema,
  bookChapterSchema,
  bookSchema,
  isbnRegex,
  validateFile,
} from "../src/lib/validations/records.ts";

test("Conference validation: valid input passes", () => {
  const result = conferenceSchema.safeParse({
    title: "Distributed Edge Computing Framework",
    topic: "Cloud & Edge Systems",
    organizer: "IEEE Computer Society",
    fromDate: "2026-08-10",
    toDate: "2026-08-12",
    nationality: "INTERNATIONAL",
  });
  assert.equal(result.success, true);
});

test("Conference validation: end date before start date fails", () => {
  const result = conferenceSchema.safeParse({
    title: "Distributed Edge Computing Framework",
    topic: "Cloud & Edge Systems",
    organizer: "IEEE Computer Society",
    fromDate: "2026-08-15",
    toDate: "2026-08-10", // Invalid!
    nationality: "NATIONAL",
  });
  assert.equal(result.success, false);
});

test("Patent validation: Design / Utility and Publish / Grant", () => {
  const valid = patentSchema.safeParse({
    type: "UTILITY",
    title: "Real-Time Cryptographic Accelerator",
    dateOfApply: "2025-05-01",
    dateOfIssue: "2026-04-10",
    status: "GRANT",
  });
  assert.equal(valid.success, true);

  const invalidType = patentSchema.safeParse({
    type: "INVALID_TYPE",
    title: "Test",
    dateOfApply: "2025-05-01",
    status: "GRANT",
  });
  assert.equal(invalidType.success, false);
});

test("Books validation: status, topic, title, ISBN string, and Date", () => {
  // Section 6 requirement: ISBN stored as string, preserving leading zeros and hyphens
  const validBook = bookSchema.safeParse({
    status: "AUTHORED",
    topic: "Distributed Algorithms",
    title: "Principles of Distributed Computing",
    isbn: "0-13-468599-7", // Starts with leading zero!
    date: "2026-09-15",
  });
  assert.equal(validBook.success, true);
  if (validBook.success) {
    assert.equal(typeof validBook.data.isbn, "string");
    assert.equal(validBook.data.isbn, "0-13-468599-7");
    assert.equal(validBook.data.status, "AUTHORED");
    assert.ok(validBook.data.date instanceof Date);
  }

  // Edited book with 13-digit ISBN
  const validEdited = bookSchema.safeParse({
    status: "EDIT",
    topic: "Artificial Intelligence in Power Systems",
    title: "Smart Grid Intelligence",
    isbn: "978-0-13-468599-1",
    date: "2026-10-01",
  });
  assert.equal(validEdited.success, true);

  // Invalid ISBN fails
  const invalidISBN = bookSchema.safeParse({
    status: "AUTHORED",
    topic: "Test Topic",
    title: "Test Book",
    isbn: "123", // Too short!
    date: "2026-10-01",
  });
  assert.equal(invalidISBN.success, false);
});

test("File upload validation: extensions, size limit, and MIME types", () => {
  // Allowed PDF under 25MB
  const validPdf = validateFile({
    name: "research_paper.pdf",
    size: 2 * 1024 * 1024,
    type: "application/pdf",
  });
  assert.equal(validPdf.valid, true);

  // Allowed Word document
  const validDocx = validateFile({
    name: "manuscript.docx",
    size: 5 * 1024 * 1024,
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  assert.equal(validDocx.valid, true);

  // Disallowed extension (e.g. .exe)
  const invalidExt = validateFile({
    name: "malware.exe",
    size: 1024,
    type: "application/x-msdownload",
  });
  assert.equal(invalidExt.valid, false);

  // File exceeding 25MB limit
  const oversized = validateFile({
    name: "heavy.pdf",
    size: 30 * 1024 * 1024, // 30MB
    type: "application/pdf",
  });
  assert.equal(oversized.valid, false);
});
