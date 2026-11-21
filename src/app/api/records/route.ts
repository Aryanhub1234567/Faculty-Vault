import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { RecordsService } from "@/server/services/records.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const academicSessionId = searchParams.get("academicSessionId") || undefined;
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Specific filters
    const nationality = searchParams.get("nationality") || undefined;
    const patentType = searchParams.get("patentType") || undefined;
    const patentStatus = searchParams.get("patentStatus") || undefined;
    const indexing = searchParams.get("indexing") || undefined;
    const bookStatus = searchParams.get("bookStatus") || undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const isAdmin = user.role === "ADMIN";
    const facultyProfileId = searchParams.get("facultyProfileId") || (!isAdmin ? user.facultyProfileId : undefined);

    const result = await RecordsService.getRecords({
      academicSessionId,
      category,
      search,
      page,
      limit,
      isAdmin,
      facultyProfileId,
      nationality,
      patentType,
      patentStatus,
      indexing,
      bookStatus,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("GET /api/records error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    if (user.accountStatus !== "APPROVED") {
      return NextResponse.json({ error: "Account pending approval" }, { status: 403 });
    }

    // Check content type
    const contentType = req.headers.get("content-type") || "";
    let category: any;
    let academicSessionId: string;
    let details: Record<string, any>;
    const files: Array<{ name: string; buffer: Buffer; mimeType: string; size: number }> = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      category = formData.get("category") as any;
      academicSessionId = formData.get("academicSessionId") as string;
      const detailsRaw = formData.get("details") as string;
      details = detailsRaw ? JSON.parse(detailsRaw) : {};

      // Parse all attached files
      const fileEntries = formData.getAll("files");
      for (const entry of fileEntries) {
        if (entry && (entry instanceof File || typeof (entry as any).arrayBuffer === "function")) {
          const arrayBuffer = await (entry as any).arrayBuffer();
          files.push({
            name: (entry as any).name || "attachment",
            buffer: Buffer.from(arrayBuffer),
            mimeType: (entry as any).type || "application/octet-stream",
            size: (entry as any).size ?? arrayBuffer.byteLength,
          });
        }
      }
    } else {
      const body = await req.json();
      category = body.category;
      academicSessionId = body.academicSessionId;
      details = body.details || {};
    }

    if (!category || !academicSessionId) {
      return NextResponse.json({ error: "Category and Academic Session are required" }, { status: 400 });
    }

    const record = await RecordsService.createRecord({
      userId: user.id,
      category,
      academicSessionId,
      details,
      files,
    });

    return NextResponse.json({ success: true, record }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/records error:", error);
    return NextResponse.json({ error: error.message || "Failed to create record" }, { status: 400 });
  }
}
