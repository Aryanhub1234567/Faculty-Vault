import { google } from "googleapis";
import { prisma } from "@/lib/db/prisma";

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  webViewLink: string;
  parentFolderId: string;
  isMock?: boolean;
}

export interface DriveFolderInfo {
  folderId: string;
  folderPath: string;
  webViewLink?: string;
  isMock?: boolean;
}

// Sanitize folder names to prevent invalid characters in Drive paths
export function sanitizeFolderName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "_").trim();
}

// Check if production Google Service Account credentials are fully configured
export function isGoogleDriveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  );
}

// Initialize authenticated Google Drive client
function getDriveClient() {
  if (!isGoogleDriveConfigured()) {
    return null;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Handle escaped newlines in env variables
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

/**
 * Builds the canonical relative folder path for a given category and metadata
 */
export function buildCategorySubpath(
  category: string,
  metadata?: {
    nationality?: string;
    type?: string;
    status?: string;
  }
): string {
  switch (category) {
    case "CONFERENCE":
      const nat = metadata?.nationality?.toUpperCase() === "INTERNATIONAL" ? "International" : "National";
      return `Conference/${nat}`;

    case "PATENT":
      const pType = metadata?.type?.toUpperCase() === "DESIGN" ? "Design" : "Utility";
      const pStat = metadata?.status?.toUpperCase() === "GRANT" ? "Grant" : "Publish";
      return `Patent/${pType}/${pStat}`;

    case "FDP":
      return "FDP";

    case "RESEARCH_ARTICLE":
      return `Research Articles/${metadata?.type || "SCOPUS"}`;

    case "BOOK_CHAPTER":
      return "Book Chapters";

    case "BOOK":
      const bStatus = metadata?.status?.toUpperCase() === "AUTHORED" ? "Authored" : "Edit";
      return `Books/${bStatus}`;

    default:
      return category;
  }
}

/**
 * Resolves or creates a Google Drive folder given a full path
 * Uses PostgreSQL DriveFolder table as a cache to prevent redundant Drive API calls.
 */
export async function getOrCreateDriveFolder(
  folderPath: string,
  options?: {
    instituteId?: string;
    facultyProfileId?: string;
    academicSessionId?: string;
    category?: string;
  }
): Promise<DriveFolderInfo> {
  const normalizedPath = folderPath.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");

  // 1. Check PostgreSQL cached folder first
  const cached = await prisma.driveFolder.findUnique({
    where: { folderPath: normalizedPath },
  });

  if (cached) {
    return {
      folderId: cached.googleDriveFolderId,
      folderPath: cached.folderPath,
      webViewLink: cached.webViewLink || undefined,
    };
  }

  // 2. If credentials not configured, use deterministic mock Drive folder
  const drive = getDriveClient();
  if (!drive) {
    const mockFolderId = `mock_drive_folder_${Buffer.from(normalizedPath).toString("base64url").slice(0, 24)}`;
    const mockWebView = `https://drive.google.com/drive/folders/${mockFolderId}`;

    const created = await prisma.driveFolder.create({
      data: {
        folderPath: normalizedPath,
        googleDriveFolderId: mockFolderId,
        folderType: "RECORD",
        webViewLink: mockWebView,
        instituteId: options?.instituteId,
        facultyProfileId: options?.facultyProfileId,
        academicSessionId: options?.academicSessionId,
        category: options?.category,
      },
    });

    return {
      folderId: created.googleDriveFolderId,
      folderPath: created.folderPath,
      webViewLink: mockWebView,
      isMock: true,
    };
  }

  // 3. Recursive directory creation on Google Drive
  const segments = normalizedPath.split("/");
  let parentId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
  let accumulatedPath = "";

  for (const segment of segments) {
    accumulatedPath = accumulatedPath ? `${accumulatedPath}/${segment}` : segment;

    const existingInDb = await prisma.driveFolder.findUnique({
      where: { folderPath: accumulatedPath },
    });

    if (existingInDb) {
      parentId = existingInDb.googleDriveFolderId;
      continue;
    }

    // Query Google Drive for folder inside parent
    const safeName = sanitizeFolderName(segment);
    const query = `'${parentId}' in parents and name = '${safeName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

    const searchRes = await drive.files.list({
      q: query,
      fields: "files(id, name, webViewLink)",
      spaces: "drive",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    let currentFolderId: string;
    let webViewLink: string | undefined;

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      currentFolderId = searchRes.data.files[0].id!;
      webViewLink = searchRes.data.files[0].webViewLink || undefined;
    } else {
      // Create new folder in Drive
      const createRes = await drive.files.create({
        requestBody: {
          name: safeName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId],
        },
        fields: "id, webViewLink",
        supportsAllDrives: true,
      });

      currentFolderId = createRes.data.id!;
      webViewLink = createRes.data.webViewLink || undefined;
    }

    // Cache in PostgreSQL
    await prisma.driveFolder.upsert({
      where: { folderPath: accumulatedPath },
      update: {
        googleDriveFolderId: currentFolderId,
        parentFolderId: parentId,
        webViewLink,
      },
      create: {
        folderPath: accumulatedPath,
        googleDriveFolderId: currentFolderId,
        parentFolderId: parentId,
        folderType: segment === segments[segments.length - 1] ? "RECORD" : "CATEGORY",
        webViewLink,
        instituteId: options?.instituteId,
        facultyProfileId: options?.facultyProfileId,
        academicSessionId: options?.academicSessionId,
        category: options?.category,
      },
    });

    parentId = currentFolderId;
  }

  return {
    folderId: parentId,
    folderPath: normalizedPath,
  };
}

/**
 * Uploads a file stream or buffer to Google Drive
 */
export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  parentFolderId: string
): Promise<DriveUploadResult> {
  const drive = getDriveClient();

  // If Drive not configured, return mock upload metadata
  if (!drive) {
    const mockFileId = `mock_file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      fileId: mockFileId,
      fileName,
      mimeType,
      fileSize: fileBuffer.length,
      webViewLink: `https://drive.google.com/file/d/${mockFileId}/view`,
      parentFolderId,
      isMock: true,
    };
  }

  const { Readable } = await import("stream");
  const mediaStream = new Readable();
  mediaStream.push(fileBuffer);
  mediaStream.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [parentFolderId],
    },
    media: {
      mimeType,
      body: mediaStream,
    },
    fields: "id, name, mimeType, size, webViewLink",
    supportsAllDrives: true,
  });

  return {
    fileId: response.data.id!,
    fileName: response.data.name || fileName,
    mimeType: response.data.mimeType || mimeType,
    fileSize: Number(response.data.size || fileBuffer.length),
    webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
    parentFolderId,
    isMock: false,
  };
}
