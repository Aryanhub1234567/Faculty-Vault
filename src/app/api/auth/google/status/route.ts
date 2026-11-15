import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { getGoogleDriveOAuthStatus } from "@/lib/google/oauth";
import { getRootFolderId } from "@/lib/google/drive";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google/status
 * Returns real-time health and connection status of the central Google Drive integration.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getGoogleDriveOAuthStatus();

    // If connected, fetch current root folder ID
    let rootFolderId = status.rootFolderId;
    if (status.connected && !rootFolderId) {
      try {
        rootFolderId = await getRootFolderId();
      } catch (err: any) {
        console.warn("Could not query root folder ID:", err.message);
      }
    }

    return NextResponse.json({
      ...status,
      rootFolderId: rootFolderId || null,
      rootFolderName: "Faculty Vault",
    });
  } catch (error: any) {
    console.error("GET /api/auth/google/status error:", error);
    return NextResponse.json(
      {
        configured: false,
        connected: false,
        error: error.message || "Failed to check Google Drive status",
      },
      { status: 500 }
    );
  }
}
