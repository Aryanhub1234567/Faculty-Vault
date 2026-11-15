import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, status, role } = body;

    if (!userId || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status or missing userId" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: status,
        ...(role && ["ADMIN", "FACULTY"].includes(role) ? { role } : {}),
      },
    });

    // Log admin approval action in AuditLog
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: `FACULTY_${status}`,
        entityType: "User",
        entityId: userId,
        details: JSON.stringify({ updatedStatus: status, updatedRole: role }),
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update status" }, { status: 400 });
  }
}
