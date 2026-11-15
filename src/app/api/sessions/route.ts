import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { academicSessionSchema } from "@/lib/validations/records";

export async function GET() {
  try {
    const sessions = await prisma.academicSession.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(sessions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = academicSessionSchema.parse(body);

    // If marked current, unset current flag on other sessions
    if (parsed.isCurrent) {
      await prisma.academicSession.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
    }

    const newSession = await prisma.academicSession.create({
      data: {
        name: parsed.name,
        isCurrent: parsed.isCurrent,
        isActive: parsed.isActive,
        startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
        endDate: parsed.endDate ? new Date(parsed.endDate) : undefined,
      },
    });

    return NextResponse.json({ success: true, session: newSession }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create session" }, { status: 400 });
  }
}
