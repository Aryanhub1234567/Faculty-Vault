import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const institutes = await prisma.institute.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(institutes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch institutes" }, { status: 500 });
  }
}
