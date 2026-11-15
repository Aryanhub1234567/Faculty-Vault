import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        facultyProfile: {
          include: { institute: true },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(dbUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const body = await req.json();
    const { department, designation, phone } = body;

    const updatedProfile = await prisma.facultyProfile.update({
      where: { userId: user.id },
      data: {
        ...(department ? { department } : {}),
        ...(designation ? { designation } : {}),
        ...(phone !== undefined ? { phone } : {}),
      },
      include: { institute: true },
    });

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 400 });
  }
}
