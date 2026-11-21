import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { RecordsService } from "@/server/services/records.service";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const isAdmin = user.role === "ADMIN";

    const record = await RecordsService.getRecordById(params.id, user.facultyProfileId, isAdmin);
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch record" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const isAdmin = user.role === "ADMIN";

    const contentType = req.headers.get("content-type") || "";
    let details: Record<string, any> = {};
    const newFiles: Array<{ name: string; buffer: Buffer; mimeType: string; size: number }> = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const detailsRaw = formData.get("details") as string;
      details = detailsRaw ? JSON.parse(detailsRaw) : {};

      const fileEntries = formData.getAll("files");
      for (const entry of fileEntries) {
        if (entry && (entry instanceof File || typeof (entry as any).arrayBuffer === "function")) {
          const arrayBuffer = await (entry as any).arrayBuffer();
          newFiles.push({
            name: (entry as any).name || "attachment",
            buffer: Buffer.from(arrayBuffer),
            mimeType: (entry as any).type || "application/octet-stream",
            size: (entry as any).size ?? arrayBuffer.byteLength,
          });
        }
      }
    } else {
      const body = await req.json();
      details = body.details || body;
    }

    const updated = await RecordsService.updateRecord(params.id, details, user.facultyProfileId, isAdmin, newFiles);
    return NextResponse.json({ success: true, record: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update record" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const isAdmin = user.role === "ADMIN";

    await RecordsService.deleteRecord(params.id, user.facultyProfileId, isAdmin);
    return NextResponse.json({ success: true, message: "Record deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete record" }, { status: 400 });
  }
}
