import { google } from "googleapis";
import { prisma } from "@/lib/db/prisma";
import { format } from "date-fns";

export const SHEET_TAB_NAMES = {
  CONFERENCE: "Conference",
  PATENT: "Patent",
  FDP: "FDP",
  RESEARCH_ARTICLE: "Research Articles",
  BOOK_CHAPTER: "Book Chapters",
  BOOK: "Books",
} as const;

export const TAB_HEADERS = {
  Conference: [
    "Record ID",
    "Faculty Name",
    "Faculty ID",
    "Faculty Email",
    "Academic Session",
    "Title",
    "Topic",
    "Organizer",
    "From (Start Date)",
    "To (End Date)",
    "Nationality",
    "Drive Link",
  ],
  Patent: [
    "Record ID",
    "Faculty Name",
    "Faculty ID",
    "Faculty Email",
    "Academic Session",
    "Type",
    "Title",
    "Date of Apply",
    "Date of Issue",
    "Status",
    "Drive Link",
  ],
  FDP: [
    "Record ID",
    "Faculty Name",
    "Faculty ID",
    "Faculty Email",
    "Academic Session",
    "Topic",
    "Organizer",
    "From (Start Date)",
    "To (End Date)",
    "Drive Link",
  ],
  "Research Articles": [
    "Record ID",
    "Faculty Name",
    "Faculty ID",
    "Faculty Email",
    "Academic Session",
    "Title",
    "Publisher",
    "Indexing",
    "Drive Link",
  ],
  "Book Chapters": [
    "Record ID",
    "Faculty Name",
    "Faculty ID",
    "Faculty Email",
    "Academic Session",
    "Title",
    "Topic",
    "Date",
    "Drive Link",
  ],
  // Books specific columns from Section 6 & 9:
  // Common: Record ID | Faculty Name | Faculty ID | Faculty Email | Academic Session
  // Specific: Status | Topic | Title | ISBN | Date | Drive Link
  Books: [
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
  ],
};

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  );
}

function getSheetsClient() {
  if (!isGoogleSheetsConfigured()) {
    return null;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

export async function queueSheetSyncJob(
  recordId: string,
  category: "CONFERENCE" | "PATENT" | "FDP" | "RESEARCH_ARTICLE" | "BOOK_CHAPTER" | "BOOK",
  action: "CREATE" | "UPDATE" | "DELETE",
  payload?: Record<string, unknown>
) {
  return await prisma.sheetSyncJob.create({
    data: {
      recordId,
      category,
      action,
      status: "PENDING",
      attempts: 0,
      payload: payload ? JSON.stringify(payload) : null,
    },
  });
}

/**
 * Maps a full Record entity to the appropriate row array for Google Sheets
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatRecordForSheet(record: any): { tabName: string; rowValues: (string | number)[] } {
  const common = [
    record.recordCode,
    record.facultyProfile?.name || "",
    record.facultyProfile?.facultyId || "",
    record.facultyProfile?.email || "",
    record.academicSession?.name || "",
  ];

  const driveLink = record.recordFolderWebViewLink || (record.attachments?.[0]?.webViewLink ?? "");

  switch (record.category) {
    case "CONFERENCE": {
      const d = record.conferenceDetails;
      return {
        tabName: SHEET_TAB_NAMES.CONFERENCE,
        rowValues: [
          ...common,
          d?.title || "",
          d?.topic || "",
          d?.organizer || "",
          d?.fromDate ? format(new Date(d.fromDate), "yyyy-MM-dd") : "",
          d?.toDate ? format(new Date(d.toDate), "yyyy-MM-dd") : "",
          d?.nationality || "",
          driveLink,
        ],
      };
    }
    case "PATENT": {
      const d = record.patentDetails;
      return {
        tabName: SHEET_TAB_NAMES.PATENT,
        rowValues: [
          ...common,
          d?.type || "",
          d?.title || "",
          d?.dateOfApply ? format(new Date(d.dateOfApply), "yyyy-MM-dd") : "",
          d?.dateOfIssue ? format(new Date(d.dateOfIssue), "yyyy-MM-dd") : "Pending",
          d?.status || "",
          driveLink,
        ],
      };
    }
    case "FDP": {
      const d = record.fdpDetails;
      return {
        tabName: SHEET_TAB_NAMES.FDP,
        rowValues: [
          ...common,
          d?.topic || "",
          d?.organizer || "",
          d?.fromDate ? format(new Date(d.fromDate), "yyyy-MM-dd") : "",
          d?.toDate ? format(new Date(d.toDate), "yyyy-MM-dd") : "",
          driveLink,
        ],
      };
    }
    case "RESEARCH_ARTICLE": {
      const d = record.researchArticleDetails;
      return {
        tabName: SHEET_TAB_NAMES.RESEARCH_ARTICLE,
        rowValues: [
          ...common,
          d?.title || "",
          d?.publisher || "",
          d?.indexing || "",
          driveLink,
        ],
      };
    }
    case "BOOK_CHAPTER": {
      const d = record.bookChapterDetails;
      return {
        tabName: SHEET_TAB_NAMES.BOOK_CHAPTER,
        rowValues: [
          ...common,
          d?.title || "",
          d?.topic || "",
          d?.date ? format(new Date(d.date), "yyyy-MM-dd") : "",
          driveLink,
        ],
      };
    }
    case "BOOK": {
      const d = record.bookDetails;
      return {
        tabName: SHEET_TAB_NAMES.BOOK,
        rowValues: [
          ...common,
          d?.status || "",
          d?.topic || "",
          d?.title || "",
          d?.isbn ? String(d.isbn) : "", // Preserving string format
          d?.date ? format(new Date(d.date), "yyyy-MM-dd") : "",
          driveLink,
        ],
      };
    }
    default:
      throw new Error(`Unknown category: ${record.category}`);
  }
}

/**
 * Processes a SheetSyncJob by creating, updating, or deleting a row in the Google Spreadsheet
 */
export async function processSheetSyncJob(jobId: string): Promise<{ success: boolean; error?: string }> {
  const job = await prisma.sheetSyncJob.findUnique({
    where: { id: jobId },
    include: {
      record: {
        include: {
          facultyProfile: true,
          academicSession: true,
          conferenceDetails: true,
          patentDetails: true,
          fdpDetails: true,
          researchArticleDetails: true,
          bookChapterDetails: true,
          bookDetails: true,
          attachments: true,
        },
      },
    },
  });

  if (!job) {
    return { success: false, error: "Sync job not found" };
  }

  // Mark job as processing
  await prisma.sheetSyncJob.update({
    where: { id: jobId },
    data: {
      status: "PROCESSING",
      attempts: { increment: 1 },
    },
  });

  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // If Sheets credentials are not configured, simulate successful mock sync
  if (!sheets || !spreadsheetId) {
    await prisma.sheetSyncJob.update({
      where: { id: jobId },
      data: {
        status: "SUCCEEDED",
        syncedAt: new Date(),
        lastError: "Synced via Local Simulator (Google Sheets credentials not set)",
      },
    });
    return { success: true };
  }

  try {
    const { tabName, rowValues } = formatRecordForSheet(job.record);
    const recordCode = job.record.recordCode;

    // 1. Check if row already exists in the tab by scanning Column A (Record ID)
    const range = `'${tabName}'!A:A`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    let rowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === recordCode) {
        rowIndex = i + 1; // 1-based index in sheets
        break;
      }
    }

    if (job.action === "DELETE") {
      if (rowIndex !== -1) {
        // Mark as deleted in status or clear row
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${tabName}'!A${rowIndex}`,
          valueInputOption: "RAW",
          requestBody: {
            values: [[`[DELETED] ${recordCode}`]],
          },
        });
      }
    } else if (rowIndex !== -1) {
      // UPDATE existing row: overwrite values at row index to prevent duplicate rows
      const endColLetter = String.fromCharCode(65 + rowValues.length - 1);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${tabName}'!A${rowIndex}:${endColLetter}${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowValues],
        },
      });
    } else {
      // CREATE new row: append to table
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${tabName}'!A:A`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [rowValues],
        },
      });
    }

    await prisma.sheetSyncJob.update({
      where: { id: jobId },
      data: {
        status: "SUCCEEDED",
        syncedAt: new Date(),
        lastError: null,
      },
    });

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await prisma.sheetSyncJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        lastError: errorMessage,
      },
    });
    return { success: false, error: errorMessage };
  }
}
