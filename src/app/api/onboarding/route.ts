import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { onboardingSchema } from "@/lib/validations/records";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = onboardingSchema.parse(body);

    // Verify email matches session to prevent impersonation
    if (parsed.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json({ error: "Email must match authenticated account" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;

    // Check if faculty profile already exists
    const existing = await prisma.facultyProfile.findUnique({
      where: { userId: user.id },
    });
    if (existing) {
      return NextResponse.json({ error: "Profile already exists" }, { status: 400 });
    }

    // Check if facultyId is already taken in institute
    const idTaken = await prisma.facultyProfile.findFirst({
      where: {
        instituteId: parsed.instituteId,
        facultyId: parsed.facultyId,
      },
    });
    if (idTaken) {
      return NextResponse.json({ error: "Faculty ID is already registered in this institute" }, { status: 400 });
    }

    // Determine admin approval requirement
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase());
    const isBootstrapAdmin = adminEmails.includes(session.user.email.toLowerCase());

    const profile = await prisma.facultyProfile.create({
      data: {
        userId: user.id,
        instituteId: parsed.instituteId,
        facultyId: parsed.facultyId.trim().toUpperCase(),
        name: parsed.name,
        email: session.user.email,
        department: parsed.department,
        designation: parsed.designation,
        phone: parsed.phone,
      },
      include: { institute: true },
    });

    // Update user status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.name,
        role: isBootstrapAdmin ? "ADMIN" : user.role || "FACULTY",
        accountStatus: isBootstrapAdmin ? "APPROVED" : "PENDING",
      },
    });

    return NextResponse.json({ success: true, profile }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/onboarding error:", error);
    return NextResponse.json({ error: error.message || "Failed to complete onboarding" }, { status: 400 });
  }
}
