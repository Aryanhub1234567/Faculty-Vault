import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import {
  generateOAuthState,
  getAuthorizationUrl,
  getGoogleOAuthConfig,
} from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google
 * Initiates the Google OAuth 2.0 Web Server Authorization Code flow.
 * Only authenticated administrators can initiate storage authorization for the institute.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;

    if (!user) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", "/admin?tab=drive");
      return NextResponse.redirect(loginUrl);
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can authorize central Google Drive storage." },
        { status: 403 }
      );
    }

    const config = getGoogleOAuthConfig();
    if (!config.clientId || !config.clientSecret) {
      return NextResponse.json(
        {
          error:
            "Google OAuth is not configured. Please define GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.",
        },
        { status: 500 }
      );
    }

    // Generate cryptographically random CSRF state
    const state = generateOAuthState();

    // Generate Google OAuth consent URL with offline access and prompt=consent
    const authUrl = getAuthorizationUrl(state);

    const wantsJson =
      req.nextUrl.searchParams.get("mode") === "json" ||
      (req.headers.get("accept")?.includes("application/json") &&
        !req.headers.get("accept")?.includes("text/html"));

    const response = wantsJson
      ? NextResponse.json({ url: authUrl, state })
      : NextResponse.redirect(authUrl);

    // Secure HTTP-Only cookie for CSRF state validation
    response.cookies.set("gdrive_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10, // 10 minutes
    });

    return response;
  } catch (error: any) {
    console.error("GET /api/auth/google error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate Google OAuth" },
      { status: 500 }
    );
  }
}
