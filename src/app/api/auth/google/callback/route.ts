import { NextRequest, NextResponse } from "next/server";
import {
  validateOAuthState,
  exchangeCodeForTokens,
} from "@/lib/google/oauth";
import { getRootFolderId } from "@/lib/google/drive";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth 2.0 callback, validates CSRF state, exchanges code for tokens,
 * persists refresh token, ensures Faculty Vault root folder exists, and redirects to Admin page.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const googleError = searchParams.get("error");

  const baseUrl = new URL("/admin", req.url);
  baseUrl.searchParams.set("tab", "drive");

  // 1. Handle error response from Google OAuth consent screen
  if (googleError) {
    console.error("Google OAuth consent returned error:", googleError);
    baseUrl.searchParams.set("error", `oauth_${googleError}`);
    const res = NextResponse.redirect(baseUrl);
    res.cookies.delete("gdrive_oauth_state");
    return res;
  }

  if (!code) {
    baseUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(baseUrl);
  }

  // 2. Validate CSRF state parameter against secure HTTP-only cookie
  const cookieState = req.cookies.get("gdrive_oauth_state")?.value;
  const isValidState = validateOAuthState(state, cookieState);

  if (!isValidState) {
    console.error("Google OAuth state validation failed. CSRF mismatch or expired state.");
    baseUrl.searchParams.set("error", "invalid_csrf_state");
    const res = NextResponse.redirect(baseUrl);
    res.cookies.delete("gdrive_oauth_state");
    return res;
  }

  // 3. Exchange authorization code for access & refresh tokens
  try {
    const { email } = await exchangeCodeForTokens(code);

    // 4. Resolve or initialize central root folder in My Drive
    try {
      await getRootFolderId();
    } catch (folderErr: any) {
      console.warn("Initial root folder check warning during OAuth callback:", folderErr.message);
    }

    baseUrl.searchParams.set("status", "connected");
    if (email) {
      baseUrl.searchParams.set("email", email);
    }

    const response = NextResponse.redirect(baseUrl);
    // Clear state cookie
    response.cookies.delete("gdrive_oauth_state");
    return response;
  } catch (err: any) {
    console.error("Failed to exchange Google OAuth code for tokens:", err);
    baseUrl.searchParams.set("error", encodeURIComponent(err.message || "token_exchange_failed"));
    const response = NextResponse.redirect(baseUrl);
    response.cookies.delete("gdrive_oauth_state");
    return response;
  }
}
