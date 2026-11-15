import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { processSheetSyncJob } from "@/lib/google/sheets";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { jobId, retryAllFailed } = body;

    let targetJobIds: string[] = [];

    if (jobId) {
      targetJobIds = [jobId];
    } else if (retryAllFailed) {
      const failedJobs = await prisma.sheetSyncJob.findMany({
        where: { status: "FAILED" },
        select: { id: true },
      });
      targetJobIds = failedJobs.map((j) => j.id);
    }

    const results = [];
    for (const id of targetJobIds) {
      const res = await processSheetSyncJob(id);
      results.push({ id, ...res });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "SHEET_SYNC_RETRY",
        entityType: "SheetSyncJob",
        details: JSON.stringify({ retriedCount: targetJobIds.length, results }),
      },
    });

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to retry sync jobs" }, { status: 400 });
  }
}
