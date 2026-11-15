import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { disconnectGoogleDrive } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/google/disconnect
 * Disconnects the central Google account and revokes stored OAuth credentials.
 * Restricted to administrators only.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can disconnect Google Drive storage." },
        { status: 403 }
      );
    }

    await disconnectGoogleDrive();

    return NextResponse.json({
      success: true,
      message: "Google Drive storage account has been successfully disconnected.",
    });
  } catch (error: any) {
    console.error("POST /api/auth/google/disconnect error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to disconnect Google Drive" },
      { status: 500 }
    );
  }
}
