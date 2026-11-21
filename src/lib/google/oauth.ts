import { google } from "googleapis";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface StoredOAuthTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string | null;
  token_type?: string | null;
  expiry_date?: number | null;
  account_email?: string | null;
  root_folder_id?: string | null;
  updated_at?: string;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  rootFolderId?: string;
  envRefreshToken?: string;
}

// Default storage file for persistent tokens (ignored by git)
const TOKENS_FILE_PATH =
  process.env.GOOGLE_TOKENS_FILE_PATH ||
  path.resolve(process.cwd(), ".google-tokens.json");

// In-memory cache of tokens to avoid disk read overhead on every API call
let memoryTokensCache: StoredOAuthTokens | null = null;

/**
 * Least-privilege Drive scope:
 * https://www.googleapis.com/auth/drive.file grants full access ONLY to files and folders
 * created or opened by Faculty Vault, ensuring the central account's private personal files
 * are never accessible to the application.
 */
export const DEFAULT_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/userinfo.email",
];

/**
 * Check if mock storage fallback is permitted.
 * Strictly forbidden in production (NODE_ENV=production).
 * In development or testing, permitted ONLY when explicitly enabled via ENABLE_MOCK_STORAGE_FALLBACK=true.
 */
export function isMockStorageFallbackAllowed(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.ENABLE_MOCK_STORAGE_FALLBACK === "true";
}

/**
 * Load Google OAuth credentials from environment variables with backwards-compatible fallbacks
 */
export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || "").trim();
  
  const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
  const redirectUri = (
    process.env.GOOGLE_REDIRECT_URI ||
    `${baseUrl}/api/auth/google/callback`
  ).trim();

  // Canonical: GOOGLE_DRIVE_ROOT_FOLDER_ID. Fallback (legacy): GOOGLE_DRIVE_FOLDER_ID
  const rootFolderId = (
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ||
    process.env.GOOGLE_DRIVE_FOLDER_ID ||
    ""
  ).trim();

  const envRefreshToken = (process.env.GOOGLE_REFRESH_TOKEN || "").trim();

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: DEFAULT_OAUTH_SCOPES,
    rootFolderId: rootFolderId || undefined,
    envRefreshToken: envRefreshToken || undefined,
  };
}

/**
 * Safely load stored tokens from disk or environment
 */
export function loadStoredTokens(): StoredOAuthTokens | null {
  if (memoryTokensCache) {
    return memoryTokensCache;
  }

  const config = getGoogleOAuthConfig();

  try {
    if (fs.existsSync(TOKENS_FILE_PATH)) {
      const raw = fs.readFileSync(TOKENS_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw) as StoredOAuthTokens;
      // If env has explicit refresh token override, prioritize it
      if (config.envRefreshToken && !parsed.refresh_token) {
        parsed.refresh_token = config.envRefreshToken;
      }
      memoryTokensCache = parsed;
      return parsed;
    }
  } catch (err) {
    console.error("Failed to load stored Google OAuth tokens from disk:", err);
  }

  // If file doesn't exist but env refresh token is provided
  if (config.envRefreshToken) {
    const envTokens: StoredOAuthTokens = {
      refresh_token: config.envRefreshToken,
      account_email: "iiimt.facultyvault@gmail.com",
      updated_at: new Date().toISOString(),
    };
    memoryTokensCache = envTokens;
    return envTokens;
  }

  return null;
}

/**
 * Persist tokens securely to disk and in-memory cache.
 * CRITICAL: If Google does not return a new refresh token on token refresh,
 * existing refresh token is preserved.
 */
export function saveStoredTokens(newTokens: Partial<StoredOAuthTokens>): StoredOAuthTokens {
  const existing = loadStoredTokens() || {};

  const merged: StoredOAuthTokens = {
    ...existing,
    ...newTokens,
    // Preserve existing refresh_token if new one is omitted or empty
    refresh_token:
      newTokens.refresh_token ||
      existing.refresh_token ||
      process.env.GOOGLE_REFRESH_TOKEN ||
      undefined,
    updated_at: new Date().toISOString(),
  };

  memoryTokensCache = merged;

  try {
    const dir = path.dirname(TOKENS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Write atomically with restricted permissions (0600 on POSIX)
    fs.writeFileSync(TOKENS_FILE_PATH, JSON.stringify(merged, null, 2), {
      encoding: "utf-8",
      mode: 0o600,
    });
  } catch (err) {
    console.error("Failed to write Google OAuth tokens to disk:", err);
  }

  return merged;
}

/**
 * Clear stored tokens (used on disconnect)
 */
export function clearStoredTokens(): void {
  memoryTokensCache = null;
  try {
    if (fs.existsSync(TOKENS_FILE_PATH)) {
      fs.unlinkSync(TOKENS_FILE_PATH);
    }
  } catch (err) {
    console.error("Failed to delete stored tokens file:", err);
  }
}

/**
 * Build an OAuth2 client configured with credentials and stored tokens
 */
export function getOAuth2Client(customRedirectUri?: string) {
  const config = getGoogleOAuthConfig();
  if (!config.clientId || !config.clientSecret) {
    return null;
  }

  const redirectUri = customRedirectUri || config.redirectUri;
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    redirectUri
  );

  const tokens = loadStoredTokens();
  if (tokens) {
    oauth2Client.setCredentials({
      access_token: tokens.access_token || undefined,
      refresh_token: tokens.refresh_token || config.envRefreshToken || undefined,
      expiry_date: tokens.expiry_date || undefined,
      token_type: tokens.token_type || undefined,
      scope: tokens.scope || undefined,
    });
  } else if (config.envRefreshToken) {
    oauth2Client.setCredentials({
      refresh_token: config.envRefreshToken,
    });
  }

  // Automatically save refreshed tokens whenever googleapis refreshes access token
  oauth2Client.on("tokens", (freshTokens) => {
    saveStoredTokens(freshTokens);
  });

  return oauth2Client;
}

/**
 * Generate a cryptographically secure random state parameter for CSRF protection
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Validate incoming OAuth state parameter
 */
export function validateOAuthState(incomingState?: string | null, cookieState?: string | null): boolean {
  if (!incomingState || !cookieState) {
    return false;
  }
  if (incomingState.length !== cookieState.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(incomingState), Buffer.from(cookieState));
}

/**
 * Generate Google OAuth consent URL with offline access to receive a refresh token
 */
export function getAuthorizationUrl(state: string, redirectUri?: string): string {
  const client = getOAuth2Client(redirectUri);
  if (!client) {
    throw new Error(
      "Google OAuth is not configured. Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set."
    );
  }

  return client.generateAuthUrl({
    access_type: "offline",
    scope: DEFAULT_OAUTH_SCOPES,
    prompt: "consent", // Forces consent prompt so Google always returns a refresh token
    include_granted_scopes: true,
    state,
  });
}

/**
 * Exchange authorization code for tokens, fetch account email, and persist tokens
 */
export async function exchangeCodeForTokens(code: string, redirectUri?: string) {
  const client = getOAuth2Client(redirectUri);
  if (!client) {
    throw new Error("Google OAuth client could not be initialized");
  }

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Retrieve email of authorized account (expected to be iiimt.facultyvault@gmail.com)
  let email: string | undefined;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const userInfo = await oauth2.userinfo.get();
    email = userInfo.data.email || undefined;
  } catch (err: any) {
    console.warn("Could not retrieve Google account email during OAuth callback:", err.message);
  }

  const saved = saveStoredTokens({
    ...tokens,
    account_email: email,
  });

  return { tokens: saved, email };
}

/**
 * Revoke OAuth token and clear credentials
 */
export async function disconnectGoogleDrive() {
  const client = getOAuth2Client();
  const tokens = loadStoredTokens();

  if (client && (tokens?.access_token || tokens?.refresh_token)) {
    try {
      const tokenToRevoke = tokens.refresh_token || tokens.access_token!;
      await client.revokeToken(tokenToRevoke);
    } catch (err: any) {
      console.warn("Google OAuth token revocation warning (continuing local disconnect):", err.message);
    }
  }

  clearStoredTokens();
  return { success: true };
}

/**
 * Check Google Drive OAuth connection status and token health
 */
export async function getGoogleDriveOAuthStatus() {
  const config = getGoogleOAuthConfig();
  const tokens = loadStoredTokens();

  const configured = Boolean(config.clientId && config.clientSecret);
  const hasRefreshToken = Boolean(tokens?.refresh_token || config.envRefreshToken);

  if (!configured) {
    const isMock = isMockStorageFallbackAllowed();
    return {
      configured: false,
      connected: false,
      accountEmail: null,
      rootFolderId: null,
      storageType: isMock ? "Mock Storage Fallback" : "Google Drive (Not Configured)",
      isMock,
      message: isMock
        ? "Mock storage fallback active (Development mode only)."
        : "Google OAuth credentials not configured in environment.",
    };
  }

  if (!hasRefreshToken) {
    return {
      configured: true,
      connected: false,
      accountEmail: tokens?.account_email || null,
      rootFolderId: tokens?.root_folder_id || config.rootFolderId || null,
      storageType: "Google Drive (OAuth 2.0)",
      isMock: false,
      message: "OAuth credentials configured. Awaiting initial administrator authorization.",
    };
  }

  // Validate credentials by requesting fresh access token
  try {
    const client = getOAuth2Client();
    if (!client) throw new Error("Could not initialize OAuth client");

    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse.token) {
      throw new Error("Unable to obtain access token from refresh token");
    }

    return {
      configured: true,
      connected: true,
      accountEmail: tokens?.account_email || "iiimt.facultyvault@gmail.com",
      rootFolderId: tokens?.root_folder_id || config.rootFolderId || null,
      expiryDate: tokens?.expiry_date || null,
      storageType: "Google Drive (My Drive)",
      scopes: DEFAULT_OAUTH_SCOPES,
      isMock: false,
      message: "Google Drive OAuth 2.0 connection is active and healthy.",
    };
  } catch (error: any) {
    const isInvalidGrant =
      error.message?.includes("invalid_grant") ||
      error.code === 400 ||
      error.code === 401;

    return {
      configured: true,
      connected: false,
      accountEmail: tokens?.account_email || null,
      rootFolderId: tokens?.root_folder_id || config.rootFolderId || null,
      storageType: "Google Drive (OAuth 2.0)",
      isMock: false,
      error: isInvalidGrant
        ? "Refresh token is invalid or has been revoked. Please re-authorize Google Drive."
        : error.message || "Failed to verify Google Drive credentials",
      message: "Google Drive authorization error.",
    };
  }
}
