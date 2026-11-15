import { google } from "googleapis";
import { prisma } from "@/lib/db/prisma";
import {
  getOAuth2Client,
  loadStoredTokens,
  saveStoredTokens,
  getGoogleOAuthConfig,
} from "@/lib/google/oauth";

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

/**
 * Check if Google Drive is configured.
 * Primary: OAuth 2.0 Web Server Flow with stored refresh token or GOOGLE_REFRESH_TOKEN.
 * Fallback: Legacy Service Account (for backwards compatibility if still present).
 */
export function isGoogleDriveConfigured(): boolean {
  const config = getGoogleOAuthConfig();
  const tokens = loadStoredTokens();

  // Primary: OAuth 2.0 configuration
  const hasOAuth = Boolean(
    config.clientId &&
      config.clientId !== "mock-google-client-id" &&
      config.clientSecret &&
      config.clientSecret !== "mock-google-client-secret" &&
      (tokens?.refresh_token || config.envRefreshToken)
  );

  if (hasOAuth) {
    return true;
  }

  // Legacy fallback: Service Account credentials (only if root folder is also specified)
  const hasServiceAccount = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      (process.env.GOOGLE_DRIVE_FOLDER_ID || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID)
  );

  return hasServiceAccount;
}

/**
 * Initialize authenticated Google Drive client.
 * Prioritizes OAuth 2.0 Client (central account: iiimt.facultyvault@gmail.com).
 * Falls back to Service Account if present, or returns null (mock mode).
 */
export function getDriveClient() {
  if (!isGoogleDriveConfigured()) {
    return null;
  }

  const oauth2 = getOAuth2Client();
  const tokens = loadStoredTokens();
  const config = getGoogleOAuthConfig();

  if (oauth2 && (tokens?.refresh_token || config.envRefreshToken)) {
    return google.drive({ version: "v3", auth: oauth2 });
  }

  // Legacy Service Account fallback if OAuth not authorized yet
  if (
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  ) {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n");
    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    return google.drive({ version: "v3", auth });
  }

  return null;
}

/**
 * Resolves or creates the central Faculty Vault root folder in My Drive.
 * Avoids creating duplicate root folders on repeated server restarts.
 */
export async function getRootFolderId(): Promise<string> {
  const config = getGoogleOAuthConfig();

  // 1. Explicit folder ID configured in environment
  if (config.rootFolderId) {
    return config.rootFolderId;
  }

  // 2. Check stored tokens
  const tokens = loadStoredTokens();
  if (tokens?.root_folder_id) {
    return tokens.root_folder_id;
  }

  // 3. Check database cache
  const cachedRoot = await prisma.driveFolder.findFirst({
    where: {
      OR: [
        { folderType: "ROOT" },
        { folderPath: "Faculty Vault" },
      ],
    },
  });

  if (cachedRoot) {
    saveStoredTokens({ root_folder_id: cachedRoot.googleDriveFolderId });
    return cachedRoot.googleDriveFolderId;
  }

  // 4. In mock mode, generate deterministic mock root ID
  const drive = getDriveClient();
  if (!drive) {
    const mockRootId = "mock_drive_root_faculty_vault";
    await prisma.driveFolder.upsert({
      where: { folderPath: "Faculty Vault" },
      update: { googleDriveFolderId: mockRootId, folderType: "ROOT" },
      create: {
        folderPath: "Faculty Vault",
        googleDriveFolderId: mockRootId,
        folderType: "ROOT",
        webViewLink: `https://drive.google.com/drive/folders/${mockRootId}`,
      },
    });
    saveStoredTokens({ root_folder_id: mockRootId });
    return mockRootId;
  }

  // 5. Query Google Drive My Drive for existing "Faculty Vault" folder
  const searchRes = await drive.files.list({
    q: "mimeType = 'application/vnd.google-apps.folder' and name = 'Faculty Vault' and trashed = false and 'root' in parents",
    spaces: "drive",
    fields: "files(id, name, webViewLink)",
  });

  let rootId: string;
  let webViewLink: string | undefined;

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    rootId = searchRes.data.files[0].id!;
    webViewLink = searchRes.data.files[0].webViewLink || undefined;
  } else {
    // Create "Faculty Vault" root folder under My Drive ('root')
    const createRes = await drive.files.create({
      requestBody: {
        name: "Faculty Vault",
        mimeType: "application/vnd.google-apps.folder",
        parents: ["root"],
      },
      fields: "id, name, webViewLink",
    });

    rootId = createRes.data.id!;
    webViewLink = createRes.data.webViewLink || undefined;
  }

  // Cache in PostgreSQL and tokens file
  await prisma.driveFolder.upsert({
    where: { folderPath: "Faculty Vault" },
    update: {
      googleDriveFolderId: rootId,
      folderType: "ROOT",
      parentFolderId: "root",
      webViewLink,
    },
    create: {
      folderPath: "Faculty Vault",
      googleDriveFolderId: rootId,
      folderType: "ROOT",
      parentFolderId: "root",
      webViewLink,
    },
  });

  saveStoredTokens({ root_folder_id: rootId });
  return rootId;
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
    case "CONFERENCE": {
      const nat = metadata?.nationality?.toUpperCase() === "INTERNATIONAL" ? "International" : "National";
      return `Conference/${nat}`;
    }

    case "PATENT": {
      const pType = metadata?.type?.toUpperCase() === "DESIGN" ? "Design" : "Utility";
      const pStat = metadata?.status?.toUpperCase() === "GRANT" ? "Grant" : "Publish";
      return `Patent/${pType}/${pStat}`;
    }

    case "FDP":
      return "FDP";

    case "RESEARCH_ARTICLE":
      return `Research Articles/${metadata?.type || "SCOPUS"}`;

    case "BOOK_CHAPTER":
      return "Book Chapters";

    case "BOOK": {
      const bStatus = metadata?.status?.toUpperCase() === "AUTHORED" ? "Authored" : "Edit";
      return `Books/${bStatus}`;
    }

    default:
      return category;
  }
}

/**
 * Resolves or creates a Google Drive folder given a full path.
 * Guarantees that all paths are nested under the Faculty Vault root folder in My Drive.
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

  // 3. Resolve central "Faculty Vault" root folder ID
  const rootFolderId = await getRootFolderId();
  if (normalizedPath === "Faculty Vault") {
    return {
      folderId: rootFolderId,
      folderPath: "Faculty Vault",
    };
  }

  // 4. Handle nested folder creation under "Faculty Vault"
  const rawSegments = normalizedPath.split("/");
  const isPrefixedWithVault = rawSegments[0] === "Faculty Vault";
  const segments = isPrefixedWithVault ? rawSegments.slice(1) : rawSegments;

  let parentId = rootFolderId;
  let accumulatedPath = isPrefixedWithVault ? "Faculty Vault" : "";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
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
    const escapedName = safeName.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const query = `'${parentId}' in parents and name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

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
      // Create new folder in Drive inside parent
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
        folderType: i === segments.length - 1 ? "RECORD" : "CATEGORY",
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
 * Uploads a document to Google Drive with parent folder ID
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
    webViewLink:
      response.data.webViewLink ||
      `https://drive.google.com/file/d/${response.data.id}/view`,
    parentFolderId,
    isMock: false,
  };
}

/**
 * Retrieve document metadata from Google Drive
 */
export async function getFileMetadata(fileId: string) {
  const drive = getDriveClient();
  if (!drive) {
    return {
      id: fileId,
      name: "mock_document.pdf",
      mimeType: "application/pdf",
      size: 1024,
      webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
      isMock: true,
    };
  }

  const res = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, webContentLink, trashed",
    supportsAllDrives: true,
  });

  return res.data;
}

/**
 * Download a document binary buffer from Google Drive
 */
export async function downloadFileFromDrive(fileId: string): Promise<Buffer> {
  const drive = getDriveClient();
  if (!drive) {
    return Buffer.from(`Mock document binary content for ${fileId}`);
  }

  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );

  return Buffer.from(res.data as ArrayBuffer);
}

/**
 * Get readable document stream from Google Drive for streaming preview/download
 */
export async function getDriveFileStream(fileId: string) {
  const drive = getDriveClient();
  if (!drive) {
    const { Readable } = await import("stream");
    const stream = new Readable();
    stream.push(Buffer.from(`Mock document stream for ${fileId}`));
    stream.push(null);
    return stream;
  }

  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  );

  return res.data;
}

/**
 * List documents and folders inside a given Drive folder
 */
export async function listDriveFiles(options?: {
  folderId?: string;
  pageSize?: number;
  pageToken?: string;
  query?: string;
}) {
  const drive = getDriveClient();
  if (!drive) {
    return {
      files: [],
      nextPageToken: null,
      isMock: true,
    };
  }

  let q = "trashed = false";
  if (options?.folderId) {
    q += ` and '${options.folderId}' in parents`;
  }
  if (options?.query) {
    q += ` and (${options.query})`;
  }

  const res = await drive.files.list({
    q,
    pageSize: options?.pageSize || 50,
    pageToken: options?.pageToken,
    fields: "nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, parents)",
    spaces: "drive",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return {
    files: res.data.files || [],
    nextPageToken: res.data.nextPageToken || null,
    isMock: false,
  };
}

/**
 * Create a new folder under a parent folder in Google Drive
 */
export async function createDriveFolder(folderName: string, parentFolderId: string) {
  const drive = getDriveClient();
  const safeName = sanitizeFolderName(folderName);

  if (!drive) {
    const mockId = `mock_folder_${Date.now()}`;
    return {
      id: mockId,
      name: safeName,
      webViewLink: `https://drive.google.com/drive/folders/${mockId}`,
      isMock: true,
    };
  }

  const res = await drive.files.create({
    requestBody: {
      name: safeName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });

  return res.data;
}

/**
 * Move a document or folder to a new parent folder
 */
export async function moveDriveFile(
  fileId: string,
  newParentFolderId: string,
  currentParentFolderId?: string
) {
  const drive = getDriveClient();
  if (!drive) {
    return { id: fileId, parents: [newParentFolderId], isMock: true };
  }

  let previousParents = currentParentFolderId;
  if (!previousParents) {
    const file = await drive.files.get({
      fileId,
      fields: "parents",
      supportsAllDrives: true,
    });
    previousParents = file.data.parents?.join(",");
  }

  const res = await drive.files.update({
    fileId,
    addParents: newParentFolderId,
    removeParents: previousParents,
    fields: "id, name, parents",
    supportsAllDrives: true,
  });

  return res.data;
}

/**
 * Rename a document or folder in Google Drive
 */
export async function renameDriveFile(fileId: string, newName: string) {
  const drive = getDriveClient();
  const safeName = sanitizeFolderName(newName);

  if (!drive) {
    return { id: fileId, name: safeName, isMock: true };
  }

  const res = await drive.files.update({
    fileId,
    requestBody: {
      name: safeName,
    },
    fields: "id, name, mimeType, webViewLink",
    supportsAllDrives: true,
  });

  return res.data;
}

/**
 * Delete a document or folder (soft trash or permanent delete)
 */
export async function deleteDriveFile(fileId: string, permanent = false) {
  const drive = getDriveClient();
  if (!drive) {
    return { id: fileId, deleted: true, isMock: true };
  }

  if (permanent) {
    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });
    return { id: fileId, deleted: true, permanent: true };
  } else {
    const res = await drive.files.update({
      fileId,
      requestBody: {
        trashed: true,
      },
      fields: "id, trashed",
      supportsAllDrives: true,
    });
    return { id: fileId, trashed: res.data.trashed, permanent: false };
  }
}

/**
 * Search documents in Google Drive by filename
 */
export async function searchDriveFiles(query: string, parentFolderId?: string) {
  const drive = getDriveClient();
  if (!drive) {
    return { files: [], isMock: true };
  }

  const escaped = query.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  let q = `trashed = false and name contains '${escaped}'`;
  if (parentFolderId) {
    q += ` and '${parentFolderId}' in parents`;
  }

  const res = await drive.files.list({
    q,
    pageSize: 30,
    fields: "files(id, name, mimeType, size, webViewLink, parents)",
    spaces: "drive",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return { files: res.data.files || [], isMock: false };
}
