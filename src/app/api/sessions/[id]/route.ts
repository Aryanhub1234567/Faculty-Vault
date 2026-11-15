import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { isCurrent, isActive, name } = body;

    if (isCurrent) {
      await prisma.academicSession.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
    }

    const updated = await prisma.academicSession.update({
      where: { id: params.id },
      data: {
        ...(typeof isCurrent === "boolean" ? { isCurrent } : {}),
        ...(typeof isActive === "boolean" ? { isActive } : {}),
        ...(name ? { name } : {}),
      },
    });

    return NextResponse.json({ success: true, session: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update session" }, { status: 400 });
  }
}
