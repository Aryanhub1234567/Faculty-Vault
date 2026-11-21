import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { processPendingSheetSyncJobs } from "@/lib/google/sheets";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/sync-jobs
 * Durable background sync worker for Google Sheets reporting outbox.
 * Supports invocations from Vercel Cron, GitHub Actions, or authenticated Admins.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    let isAuthorized = false;

    // 1. Authorized via CRON_SECRET header or query parameter
    if (cronSecret) {
      if (authHeader === `Bearer ${cronSecret}`) {
        isAuthorized = true;
      }
      const urlSecret = new URL(req.url).searchParams.get("secret");
      if (urlSecret === cronSecret) {
        isAuthorized = true;
      }
    }

    // 2. Or authorized via authenticated Admin session
    if (!isAuthorized) {
      const session = await getServerSession(authOptions);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = session?.user as any;
      if (user?.role === "ADMIN") {
        isAuthorized = true;
      }
    }

    // If CRON_SECRET is configured and user is neither admin nor has cron secret, reject
    if (cronSecret && !isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);

    const result = await processPendingSheetSyncJobs(limit);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error("GET /api/cron/sync-jobs error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process pending sync jobs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
