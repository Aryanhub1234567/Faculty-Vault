import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { runGoogleSheetsDiagnostic } from "@/lib/google/sheets";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sheets-diagnostic
 * Runs the backend diagnostic for Google Sheets reporting.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const diagnostic = await runGoogleSheetsDiagnostic();
    return NextResponse.json(diagnostic);
  } catch (error: any) {
    console.error("GET /api/admin/sheets-diagnostic error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Diagnostic failed",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
