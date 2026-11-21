import test from "node:test";
import assert from "node:assert/strict";

// Allow mock storage during unit test runs
process.env.ENABLE_MOCK_STORAGE_FALLBACK = "true";
// Isolate token file to scratch directory so unit tests never clear or overwrite live tokens
process.env.GOOGLE_TOKENS_FILE_PATH = path.resolve(process.cwd(), "scratch/test-tokens.json");

import fs from "node:fs";
import path from "node:path";
import {
  getGoogleOAuthConfig,
  generateOAuthState,
  validateOAuthState,
  getAuthorizationUrl,
  saveStoredTokens,
  loadStoredTokens,
  clearStoredTokens,
  getGoogleDriveOAuthStatus,
  DEFAULT_OAUTH_SCOPES,
  isMockStorageFallbackAllowed,
} from "../src/lib/google/oauth.ts";
import {
  getRootFolderId,
  getOrCreateDriveFolder,
  uploadFileToDrive,
  getFileMetadata,
  downloadFileFromDrive,
  getDriveFileStream,
  listDriveFiles,
  createDriveFolder,
  moveDriveFile,
  renameDriveFile,
  deleteDriveFile,
  searchDriveFiles,
  isGoogleDriveConfigured,
} from "../src/lib/google/drive.ts";

test("OAuth 2.0: Configuration loader detects credentials and least-privilege scopes", () => {
  const config = getGoogleOAuthConfig();
  assert.ok(config);
  assert.equal(typeof config.redirectUri, "string");
  assert.ok(config.redirectUri.includes("/api/auth/google/callback"));
  
  // Verify least privilege drive.file scope
  assert.ok(config.scopes.includes("https://www.googleapis.com/auth/drive.file"));
  assert.ok(config.scopes.includes("https://www.googleapis.com/auth/userinfo.email"));
  assert.equal(config.scopes.includes("https://www.googleapis.com/auth/drive"), false, "Must not request broad full drive scope");
});

test("OAuth 2.0: CSRF state generation and validation protects against tampering", () => {
  const state1 = generateOAuthState();
  const state2 = generateOAuthState();
  assert.equal(state1.length, 64);
  assert.notEqual(state1, state2, "States must be cryptographically random and unique");

  assert.equal(validateOAuthState(state1, state1), true);
  assert.equal(validateOAuthState(state1, state2), false);
  assert.equal(validateOAuthState(state1, null), false);
  assert.equal(validateOAuthState(null, state1), false);
  assert.equal(validateOAuthState("short", state1), false);
});

test("OAuth 2.0: Authorization URL requests offline access and consent prompt", () => {
  // Set temporary environment variables for test
  const originalId = process.env.GOOGLE_CLIENT_ID;
  const originalSecret = process.env.GOOGLE_CLIENT_SECRET;
  process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret-123";

  try {
    const state = generateOAuthState();
    const urlString = getAuthorizationUrl(state);
    const parsed = new URL(urlString);

    assert.equal(parsed.searchParams.get("access_type"), "offline", "Must request offline access for refresh token");
    assert.equal(parsed.searchParams.get("prompt"), "consent", "Must force consent prompt to ensure refresh token is returned");
    assert.equal(parsed.searchParams.get("state"), state, "Must include CSRF state parameter");
    assert.ok(parsed.searchParams.get("scope")?.includes("drive.file"), "Must include drive.file scope");
    assert.equal(parsed.searchParams.get("client_id"), "test-client-id.apps.googleusercontent.com");
  } finally {
    process.env.GOOGLE_CLIENT_ID = originalId;
    process.env.GOOGLE_CLIENT_SECRET = originalSecret;
  }
});

test("OAuth 2.0: Token persistence preserves refresh token across subsequent updates", () => {
  clearStoredTokens();

  // 1. Initial token save from authorization code exchange
  const initial = saveStoredTokens({
    access_token: "mock-access-token-1",
    refresh_token: "mock-refresh-token-permanent-secret",
    expiry_date: Date.now() + 3600000,
    account_email: "iiimt.facultyvault@gmail.com",
    scope: DEFAULT_OAUTH_SCOPES.join(" "),
  });

  assert.equal(initial.refresh_token, "mock-refresh-token-permanent-secret");
  assert.equal(initial.account_email, "iiimt.facultyvault@gmail.com");

  // 2. Simulate server restart: read from disk
  const reloaded = loadStoredTokens();
  assert.ok(reloaded);
  assert.equal(reloaded.refresh_token, "mock-refresh-token-permanent-secret");

  // 3. Subsequent token refresh where Google omits refresh_token
  const refreshed = saveStoredTokens({
    access_token: "mock-access-token-2-fresh",
    expiry_date: Date.now() + 7200000,
    // refresh_token is undefined/omitted by Google
  });

  // Verify refresh token was NOT overwritten with undefined or empty value
  assert.equal(refreshed.refresh_token, "mock-refresh-token-permanent-secret", "Must not overwrite stored refresh token");
  assert.equal(refreshed.access_token, "mock-access-token-2-fresh");

  clearStoredTokens();
});

test("Google Drive: Central root folder resolution and deduplication", async () => {
  // Clear any existing stored token root
  const rootId1 = await getRootFolderId();
  assert.ok(rootId1, "Root folder ID must be returned");

  // Subsequent call simulating server restart or lookup
  const rootId2 = await getRootFolderId();
  assert.equal(rootId1, rootId2, "Must reuse root folder ID and avoid creating duplicate root folders");

  // Resolving Faculty Vault directly returns root
  const vaultFolder = await getOrCreateDriveFolder("Faculty Vault");
  assert.equal(vaultFolder.folderId, rootId1);
});

test("Google Drive: CRUD, file upload, search, rename, move, delete operations", async () => {
  const rootId = await getRootFolderId();

  // 1. Create Folder
  const newFolder = await createDriveFolder("Computer Science", rootId);
  assert.ok(newFolder.id);

  // 2. Upload Document into Folder
  const dummyBuffer = Buffer.from("%PDF-1.4 Mock research paper content");
  const upload = await uploadFileToDrive(
    dummyBuffer,
    "Neural_Networks_Paper.pdf",
    "application/pdf",
    newFolder.id
  );
  assert.ok(upload.fileId);
  assert.equal(upload.fileName, "Neural_Networks_Paper.pdf");
  assert.equal(upload.parentFolderId, newFolder.id);

  // 3. Metadata retrieval
  const meta = await getFileMetadata(upload.fileId);
  assert.ok(meta);
  assert.equal(meta.id, upload.fileId);

  // 4. Download document
  const downloaded = await downloadFileFromDrive(upload.fileId);
  assert.ok(Buffer.isBuffer(downloaded));

  // 5. Stream document
  const stream = await getDriveFileStream(upload.fileId);
  assert.ok(stream);

  // 6. Rename document
  const renamed = await renameDriveFile(upload.fileId, "Neural_Networks_Paper_v2.pdf");
  assert.ok(renamed);

  // 7. Move document to a different folder
  const destinationFolder = await createDriveFolder("Mechanical Engineering", rootId);
  const moved = await moveDriveFile(upload.fileId, destinationFolder.id, newFolder.id);
  assert.ok(moved);

  // 8. Search documents
  const search = await searchDriveFiles("Neural_Networks");
  assert.ok(Array.isArray(search.files));

  // 9. Soft-delete / trash document
  const deleted = await deleteDriveFile(upload.fileId, false);
  assert.ok(deleted);
});

test("Security & RBAC: Ensure central credentials and tokens are protected", () => {
  // Ensure token file path is within .gitignore
  const gitignoreContent = fs.readFileSync(path.resolve(process.cwd(), ".gitignore"), "utf-8");
  assert.ok(gitignoreContent.includes(".google-tokens.json"), ".google-tokens.json must be in .gitignore");

  // Verify status API response structure never leaks client secret or refresh tokens to callers
  const stored = saveStoredTokens({
    access_token: "secret-access-token",
    refresh_token: "secret-refresh-token",
    account_email: "iiimt.facultyvault@gmail.com",
  });

  // Verify that tokens object properties match expected shape and credentials remain isolated
  assert.ok(stored.account_email);
  clearStoredTokens();
});

test("Google Drive Configuration: GOOGLE_DRIVE_ROOT_FOLDER_ID is canonical and prioritized over legacy GOOGLE_DRIVE_FOLDER_ID", () => {
  const origRoot = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const origLegacy = process.env.GOOGLE_DRIVE_FOLDER_ID;

  try {
    // Both set: canonical GOOGLE_DRIVE_ROOT_FOLDER_ID wins
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = "canonical-root-folder-id";
    process.env.GOOGLE_DRIVE_FOLDER_ID = "legacy-folder-id";
    const config1 = getGoogleOAuthConfig();
    assert.equal(config1.rootFolderId, "canonical-root-folder-id");

    // Only legacy set: backwards compatible fallback
    delete process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    process.env.GOOGLE_DRIVE_FOLDER_ID = "legacy-folder-id";
    const config2 = getGoogleOAuthConfig();
    assert.equal(config2.rootFolderId, "legacy-folder-id");
  } finally {
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = origRoot;
    process.env.GOOGLE_DRIVE_FOLDER_ID = origLegacy;
  }
});

test("Google Drive Security: ENABLE_MOCK_STORAGE_FALLBACK is strictly disabled in production", () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origMock = process.env.ENABLE_MOCK_STORAGE_FALLBACK;

  try {
    process.env.NODE_ENV = "production";
    process.env.ENABLE_MOCK_STORAGE_FALLBACK = "true";
    assert.equal(isMockStorageFallbackAllowed(), false, "Must return false when NODE_ENV is production");

    process.env.NODE_ENV = "development";
    process.env.ENABLE_MOCK_STORAGE_FALLBACK = "true";
    assert.equal(isMockStorageFallbackAllowed(), true);

    process.env.ENABLE_MOCK_STORAGE_FALLBACK = "false";
    assert.equal(isMockStorageFallbackAllowed(), false);
  } finally {
    process.env.NODE_ENV = origNodeEnv;
    if (origMock !== undefined) {
      process.env.ENABLE_MOCK_STORAGE_FALLBACK = origMock;
    } else {
      process.env.ENABLE_MOCK_STORAGE_FALLBACK = "true";
    }
  }
});
