import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { processSheetSyncJob } from "@/lib/google/sheets";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const jobs = await prisma.sheetSyncJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        record: {
          select: {
            recordCode: true,
            category: true,
            facultyProfile: {
              select: { name: true, facultyId: true },
            },
          },
        },
      },
    });

    return NextResponse.json(jobs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch sync jobs" }, { status: 500 });
  }
}
