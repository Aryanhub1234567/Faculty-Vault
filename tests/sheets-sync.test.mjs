import test from "node:test";
import assert from "node:assert/strict";
import {
  formatRecordForSheet,
  SHEET_TAB_NAMES,
  TAB_HEADERS,
  validateSpreadsheet,
  processSheetSyncJob,
} from "../src/lib/google/sheets.ts";

test("Google Sheets reporting: verify 6 tab names and common headers", () => {
  assert.equal(SHEET_TAB_NAMES.CONFERENCE, "Conference");
  assert.equal(SHEET_TAB_NAMES.PATENT, "Patent");
  assert.equal(SHEET_TAB_NAMES.FDP, "FDP");
  assert.equal(SHEET_TAB_NAMES.RESEARCH_ARTICLE, "Research Articles");
  assert.equal(SHEET_TAB_NAMES.BOOK_CHAPTER, "Book Chapters");
  assert.equal(SHEET_TAB_NAMES.BOOK, "Books");

  // Verify Books columns from Section 6 & 9:
  // Common: Record ID | Faculty Name | Faculty ID | Faculty Email | Academic Session
  // Specific: Status | Topic | Title | ISBN | Date | Drive Link
  const expectedBookHeaders = [
    "Record ID",
    "Faculty Name",
    "Faculty ID",
    "Faculty Email",
    "Academic Session",
    "Status",
    "Topic",
    "Title",
    "ISBN",
    "Date",
    "Drive Link",
  ];
  assert.deepEqual(TAB_HEADERS.Books, expectedBookHeaders);
});

test("Google Sheets row mapping for Books preserves ISBN string and date", () => {
  const mockBookRecord = {
    recordCode: "REC-BOOK-6001",
    category: "BOOK",
    facultyProfile: {
      name: "Dr. Rajesh Sharma",
      facultyId: "F001",
      email: "dr.sharma@facultyvault.edu",
    },
    academicSession: {
      name: "2026-27",
    },
    recordFolderWebViewLink: "https://drive.google.com/drive/folders/mock_book_6001",
    bookDetails: {
      status: "AUTHORED",
      topic: "Distributed Systems Architecture",
      title: "Scalable Cloud-Native Computing",
      isbn: "0-13-468599-7", // Leading zero string
      date: new Date("2026-09-15T00:00:00.000Z"),
    },
  };

  const { tabName, rowValues } = formatRecordForSheet(mockBookRecord);
  assert.equal(tabName, "Books");

  // Common fields
  assert.equal(rowValues[0], "REC-BOOK-6001");
  assert.equal(rowValues[1], "Dr. Rajesh Sharma");
  assert.equal(rowValues[2], "F001");
  assert.equal(rowValues[3], "dr.sharma@facultyvault.edu");
  assert.equal(rowValues[4], "2026-27");

  // Specific Book fields
  assert.equal(rowValues[5], "AUTHORED"); // Status
  assert.equal(rowValues[6], "Distributed Systems Architecture"); // Topic
  assert.equal(rowValues[7], "Scalable Cloud-Native Computing"); // Title
  assert.equal(rowValues[8], "0-13-468599-7"); // ISBN string preserved!
  assert.equal(rowValues[9], "2026-09-15"); // Date formatted YYYY-MM-DD
  assert.equal(rowValues[10], "https://drive.google.com/drive/folders/mock_book_6001");
});

test("Google Sheets row mapping for Conference", () => {
  const mockConfRecord = {
    recordCode: "REC-CONF-1001",
    category: "CONFERENCE",
    facultyProfile: {
      name: "Dr. Rajesh Sharma",
      facultyId: "F001",
      email: "dr.sharma@facultyvault.edu",
    },
    academicSession: {
      name: "2026-27",
    },
    recordFolderWebViewLink: "https://drive.google.com/drive/folders/mock_conf_1001",
    conferenceDetails: {
      title: "Edge Intelligence Summit",
      topic: "Distributed Systems",
      organizer: "IEEE",
      fromDate: new Date("2026-08-14T00:00:00.000Z"),
      toDate: new Date("2026-08-16T00:00:00.000Z"),
      nationality: "INTERNATIONAL",
    },
  };

  const { tabName, rowValues } = formatRecordForSheet(mockConfRecord);
  assert.equal(tabName, "Conference");
  assert.equal(rowValues[0], "REC-CONF-1001");
  assert.equal(rowValues[5], "Edge Intelligence Summit");
  assert.equal(rowValues[10], "INTERNATIONAL");
});

test("Google Sheets reporting: validates spreadsheet ID and rejects empty configuration", async () => {
  await assert.rejects(
    async () => {
      await validateSpreadsheet("");
    },
    {
      message: /GOOGLE_SHEETS_SPREADSHEET_ID is missing or empty/,
    }
  );

  const missingResult = await processSheetSyncJob("non-existent-job-id");
  assert.equal(missingResult.success, false);
  assert.equal(missingResult.error, "Sync job not found");
});
