import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const [
      totalFaculty,
      pendingApprovals,
      totalRecords,
      totalAttachments,
      totalSyncJobs,
      failedSyncJobs,
    ] = await Promise.all([
      prisma.facultyProfile.count(),
      prisma.user.count({ where: { accountStatus: "PENDING" } }),
      prisma.record.count({ where: { deletedAt: null } }),
      prisma.attachment.count(),
      prisma.sheetSyncJob.count(),
      prisma.sheetSyncJob.count({ where: { status: "FAILED" } }),
    ]);

    // Category breakdown
    const categoryCounts = await prisma.record.groupBy({
      by: ["category"],
      where: { deletedAt: null },
      _count: { id: true },
    });

    const categoryMap: Record<string, number> = {
      CONFERENCE: 0,
      PATENT: 0,
      FDP: 0,
      RESEARCH_ARTICLE: 0,
      BOOK_CHAPTER: 0,
      BOOK: 0,
    };
    categoryCounts.forEach((c) => {
      categoryMap[c.category] = c._count.id;
    });

    return NextResponse.json({
      stats: {
        totalFaculty,
        pendingApprovals,
        totalRecords,
        totalAttachments,
        totalSyncJobs,
        failedSyncJobs,
        categories: categoryMap,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch stats" }, { status: 500 });
  }
}
