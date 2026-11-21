import { google } from "googleapis";
import { prisma } from "@/lib/db/prisma";
import { format } from "date-fns";
import { getOAuth2Client, loadStoredTokens } from "@/lib/google/oauth";
import { getRootFolderId, getDriveClient } from "@/lib/google/drive";

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
  const hasSpreadsheetId = Boolean(process.env.GOOGLE_SHEETS_SPREADSHEET_ID);
  if (!hasSpreadsheetId) return false;

  const tokens = loadStoredTokens();
  const hasOAuth = Boolean(
    (process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID) &&
      (tokens?.refresh_token || process.env.GOOGLE_REFRESH_TOKEN)
  );

  const hasServiceAccount = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );

  return hasOAuth || hasServiceAccount;
}

function getSheetsClient() {
  if (!isGoogleSheetsConfigured()) {
    return null;
  }

  const oauth2 = getOAuth2Client();
  const tokens = loadStoredTokens();
  if (oauth2 && (tokens?.refresh_token || process.env.GOOGLE_REFRESH_TOKEN)) {
    return google.sheets({ version: "v4", auth: oauth2 });
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (email && privateKey) {
    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    return google.sheets({ version: "v4", auth });
  }

  return null;
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
 * Validates that the configured Google Spreadsheet exists, is accessible, and returns its metadata.
 */
export async function validateSpreadsheet(
  spreadsheetId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client?: any
): Promise<{ valid: boolean; title: string; sheetTitles: string[] }> {
  const cleanId = (spreadsheetId || "").trim();
  if (!cleanId) {
    throw new Error(
      "Configuration error: GOOGLE_SHEETS_SPREADSHEET_ID is missing or empty. Please configure the target Spreadsheet ID in environment variables."
    );
  }

  const sheets = client || getSheetsClient();
  if (!sheets) {
    throw new Error(
      "Authentication error: Google Sheets client is not configured or authorized. Verify Google credentials and ensure spreadsheets scope is granted."
    );
  }

  try {
    const res = await sheets.spreadsheets.get({
      spreadsheetId: cleanId,
      fields: "spreadsheetId,properties.title,sheets.properties(sheetId,title)",
    });

    const title = res.data.properties?.title || "Untitled Spreadsheet";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sheetTitles = (res.data.sheets || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((s: any) => s.properties?.title)
      .filter(Boolean) as string[];

    return {
      valid: true,
      title,
      sheetTitles,
    };
  } catch (err: any) {
    const errorMsg =
      err.response?.data?.error?.message || err.message || "Unknown error";
    throw new Error(
      `Google Sheets validation failed for ID "${cleanId}": ${errorMsg}`
    );
  }
}

/**
 * Converts a 1-based column index to an Excel/Google Sheets column letter.
 * e.g., 1 -> 'A', 12 -> 'L', 26 -> 'Z', 27 -> 'AA'
 */
export function columnIndexToLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = "";
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

/**
 * Resolves or auto-provisions the reporting spreadsheet.
 * Priority:
 * 1. An explicitly configured and accessible GOOGLE_SHEETS_SPREADSHEET_ID from process.env.
 * 2. An existing spreadsheet cached in PostgreSQL DriveFolder with folderType: "SPREADSHEET".
 * 3. Search Google Drive within the Faculty Vault root folder for an existing spreadsheet named "Faculty Vault - Academic Records Reporting".
 * 4. If none exists, creates a new spreadsheet in the connected Google account, organizes it inside the Faculty Vault root folder,
 *    initializes all 6 tabs with headers, and caches the ID in PostgreSQL DriveFolder.
 */
export async function getOrInitializeReportingSpreadsheet(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client?: any
): Promise<string> {
  const sheets = client || getSheetsClient();
  if (!sheets) {
    throw new Error(
      "Google Sheets client is not configured or authorized. Ensure the central Google account is connected."
    );
  }

  // 1. Check environment variable if configured and accessible
  const envId = (process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "").trim();
  if (envId) {
    try {
      await validateSpreadsheet(envId, sheets);
      return envId;
    } catch (err: any) {
      console.warn(
        `[SheetsSync] Configured GOOGLE_SHEETS_SPREADSHEET_ID "${envId}" is inaccessible under current credentials: ${err.message}. Resolving application-managed spreadsheet...`
      );
    }
  }

  // 2. Check PostgreSQL cache
  const cached = await prisma.driveFolder.findFirst({
    where: {
      folderType: "SPREADSHEET",
      folderPath: "Faculty Vault Reporting Spreadsheet",
    },
  });

  if (cached?.googleDriveFolderId) {
    try {
      await validateSpreadsheet(cached.googleDriveFolderId, sheets);
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID = cached.googleDriveFolderId;
      return cached.googleDriveFolderId;
    } catch (err: any) {
      console.warn(
        `[SheetsSync] Cached spreadsheet ID "${cached.googleDriveFolderId}" is no longer valid: ${err.message}. Re-provisioning...`
      );
    }
  }

  // 3. Resolve Faculty Vault root folder
  let rootFolderId: string | null = null;
  try {
    rootFolderId = await getRootFolderId();
  } catch (err: any) {
    console.warn("[SheetsSync] Root folder could not be resolved:", err.message);
  }

  // 4. Query Google Drive for existing reporting spreadsheet inside root folder
  const drive = getDriveClient();
  if (drive && rootFolderId) {
    try {
      const searchRes = await drive.files.list({
        q: `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and name = 'Faculty Vault - Academic Records Reporting' and trashed = false`,
        spaces: "drive",
        fields: "files(id, name, webViewLink)",
      });
      const existingFile = searchRes.data.files?.[0];
      if (existingFile?.id) {
        await validateSpreadsheet(existingFile.id, sheets);
        // Cache in DB
        await prisma.driveFolder.upsert({
          where: { folderPath: "Faculty Vault Reporting Spreadsheet" },
          update: {
            googleDriveFolderId: existingFile.id,
            parentFolderId: rootFolderId,
            webViewLink:
              existingFile.webViewLink ||
              `https://docs.google.com/spreadsheets/d/${existingFile.id}/edit`,
            folderType: "SPREADSHEET",
          },
          create: {
            folderPath: "Faculty Vault Reporting Spreadsheet",
            googleDriveFolderId: existingFile.id,
            parentFolderId: rootFolderId,
            webViewLink:
              existingFile.webViewLink ||
              `https://docs.google.com/spreadsheets/d/${existingFile.id}/edit`,
            folderType: "SPREADSHEET",
          },
        });
        process.env.GOOGLE_SHEETS_SPREADSHEET_ID = existingFile.id;
        return existingFile.id;
      }
    } catch (searchErr: any) {
      console.warn(
        "[SheetsSync] Search for existing spreadsheet failed:",
        searchErr.message
      );
    }
  }

  // 5. Create new reporting spreadsheet with all 6 tabs
  const tabList = [
    SHEET_TAB_NAMES.CONFERENCE,
    SHEET_TAB_NAMES.PATENT,
    SHEET_TAB_NAMES.FDP,
    SHEET_TAB_NAMES.RESEARCH_ARTICLE,
    SHEET_TAB_NAMES.BOOK_CHAPTER,
    SHEET_TAB_NAMES.BOOK,
  ];

  const createRes = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "Faculty Vault - Academic Records Reporting",
      },
      sheets: tabList.map((title) => ({
        properties: {
          title,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      })),
    },
  });

  const newSpreadsheetId = createRes.data.spreadsheetId;
  if (!newSpreadsheetId) {
    throw new Error(
      "Failed to create Google Spreadsheet: no spreadsheetId returned."
    );
  }

  // Populate headers in all 6 tabs
  for (const tab of tabList) {
    const headers = (TAB_HEADERS as Record<string, string[]>)[tab];
    if (headers && headers.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: newSpreadsheetId,
        range: `'${tab}'!A1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [headers],
        },
      });
    }
  }

  // Move spreadsheet into Faculty Vault root folder
  let webViewLink = `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit`;
  if (drive && rootFolderId) {
    try {
      const updateRes = await drive.files.update({
        fileId: newSpreadsheetId,
        addParents: rootFolderId,
        fields: "id, parents, name, webViewLink",
      });
      if (updateRes.data.webViewLink) {
        webViewLink = updateRes.data.webViewLink;
      }
    } catch (moveErr: any) {
      console.warn(
        "[SheetsSync] Could not move spreadsheet into root folder:",
        moveErr.message
      );
    }
  }

  // Cache in PostgreSQL
  await prisma.driveFolder.upsert({
    where: { folderPath: "Faculty Vault Reporting Spreadsheet" },
    update: {
      googleDriveFolderId: newSpreadsheetId,
      parentFolderId: rootFolderId,
      webViewLink,
      folderType: "SPREADSHEET",
    },
    create: {
      folderPath: "Faculty Vault Reporting Spreadsheet",
      googleDriveFolderId: newSpreadsheetId,
      parentFolderId: rootFolderId,
      webViewLink,
      folderType: "SPREADSHEET",
    },
  });

  process.env.GOOGLE_SHEETS_SPREADSHEET_ID = newSpreadsheetId;
  return newSpreadsheetId;
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

  // 1. Validate Google Sheets client authorization
  if (!sheets) {
    const authError =
      "Google Sheets reporting authorization error: Google Sheets client is not configured or authorized. Ensure the central Google account is connected and has granted required permissions.";
    await prisma.sheetSyncJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        lastError: authError,
      },
    });
    return { success: false, error: authError };
  }

  // 2. Resolve canonical reporting spreadsheet ID
  let spreadsheetId: string;
  let spreadsheetMeta: { valid: boolean; title: string; sheetTitles: string[] };

  try {
    spreadsheetId = await getOrInitializeReportingSpreadsheet(sheets);
    spreadsheetMeta = await validateSpreadsheet(spreadsheetId, sheets);
  } catch (resErr: any) {
    const errorMsg = `Google Sheets reporting resolution error: ${resErr.message}`;
    await prisma.sheetSyncJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        lastError: errorMsg,
      },
    });
    return { success: false, error: errorMsg };
  }

  try {
    const { tabName, rowValues } = formatRecordForSheet(job.record);
    const recordCode = job.record.recordCode;

    // 3. Ensure destination category tab exists; initialize with headers if missing
    if (!spreadsheetMeta.sheetTitles.includes(tabName)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: tabName,
                  gridProperties: {
                    frozenRowCount: 1,
                  },
                },
              },
            },
          ],
        },
      });

      const tabHeaderList = (TAB_HEADERS as Record<string, string[]>)[tabName] || [];
      if (tabHeaderList.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${tabName}'!A1`,
          valueInputOption: "RAW",
          requestBody: {
            values: [tabHeaderList],
          },
        });
      }
    }

    // 4. Check if row already exists in the tab by scanning Column A (Record ID)
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
      const endColLetter = columnIndexToLetter(rowValues.length);
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

/**
 * Processes pending or retriable failed sync jobs.
 */
export async function processPendingSheetSyncJobs(limit = 20): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
}> {
  const jobs = await prisma.sheetSyncJob.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: 5 },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const results = [];
  let succeeded = 0;
  let failed = 0;

  for (const job of jobs) {
    const res = await processSheetSyncJob(job.id);
    results.push({ id: job.id, ...res });
    if (res.success) succeeded++;
    else failed++;
  }

  return {
    processed: results.length,
    succeeded,
    failed,
    results,
  };
}

/**
 * Diagnostic runner that verifies:
 * 1. OAuth authentication using stored credentials.
 * 2. Spreadsheets metadata retrieval (title, 6 sheet/tab names).
 * 3. Write permission via controlled append.
 * 4. Read back of persisted value.
 * 5. Clean-up of diagnostic row.
 */
export async function runGoogleSheetsDiagnostic(): Promise<{
  success: boolean;
  spreadsheetId: string;
  title: string;
  sheetTitles: string[];
  appendVerified: boolean;
  persistedValues?: unknown;
  details: string;
}> {
  const sheets = getSheetsClient();
  if (!sheets) {
    throw new Error(
      "Diagnostic failed: Google Sheets client is not configured or authorized."
    );
  }

  const spreadsheetId = await getOrInitializeReportingSpreadsheet(sheets);
  const meta = await validateSpreadsheet(spreadsheetId, sheets);

  // Perform controlled test append to Conference tab
  const testRecordId = `DIAG-${Date.now()}`;
  const testRow = [
    testRecordId,
    "Diagnostic Probe",
    "DIAG-000",
    "diagnostic@facultyvault.internal",
    "2026-27",
    "Health Probe Conference",
    "Diagnostic Verification",
    "Faculty Vault System",
    "2026-11-01",
    "2026-11-02",
    "NATIONAL",
    "https://facultyvault.internal/health",
  ];

  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "'Conference'!A:A",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [testRow],
    },
  });

  const updatedRows = appendRes.data.updates?.updatedRows || 0;
  if (updatedRows === 0) {
    throw new Error(
      "Diagnostic failed: Controlled test append produced 0 updated rows."
    );
  }

  // Scan column A to locate and read back the probe row
  const scanRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'Conference'!A:A",
  });
  const rows = scanRes.data.values || [];
  let probeRowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === testRecordId) {
      probeRowIndex = i + 1;
      break;
    }
  }

  if (probeRowIndex === -1) {
    throw new Error(
      "Diagnostic failed: Could not locate persisted probe row in Google Sheets."
    );
  }

  const readRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'Conference'!A${probeRowIndex}:L${probeRowIndex}`,
  });
  const readBack = readRes.data.values?.[0];

  if (!readBack || readBack[0] !== testRecordId) {
    throw new Error(
      `Diagnostic failed: Read back values did not match probe ID "${testRecordId}".`
    );
  }

  // Clean up probe row
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'Conference'!A${probeRowIndex}:L${probeRowIndex}`,
  });

  return {
    success: true,
    spreadsheetId,
    title: meta.title,
    sheetTitles: meta.sheetTitles,
    appendVerified: true,
    persistedValues: readBack,
    details: `Successfully verified read/write/append to spreadsheet "${meta.title}" (${spreadsheetId}) across ${meta.sheetTitles.length} tabs.`,
  };
}
