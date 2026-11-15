import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { isGoogleDriveConfigured, getDriveFileStream } from "@/lib/google/drive";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const isAdmin = user.role === "ADMIN";

    const attachment = await prisma.attachment.findUnique({
      where: { id: params.id },
      include: {
        record: {
          select: {
            facultyProfileId: true,
            deletedAt: true,
            recordCode: true,
          },
        },
      },
    });

    if (!attachment || attachment.record.deletedAt) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // RBAC check: faculty can only view their own attachments unless admin
    if (!isAdmin && attachment.record.facultyProfileId !== user.facultyProfileId) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view this file" }, { status: 403 });
    }

    // If production Google Drive configured and file has driveFileId, stream from Drive
    if (isGoogleDriveConfigured() && attachment.driveFileId && !attachment.driveFileId.startsWith("mock_")) {
      const driveStream = await getDriveFileStream(attachment.driveFileId);

      return new Response(driveStream as any, {
        headers: {
          "Content-Type": attachment.mimeType,
          "Content-Disposition": `inline; filename="${attachment.fileName}"`,
          "Content-Length": attachment.fileSize.toString(),
        },
      });
    }

    // In local demo / mock mode: return attachment metadata and demo payload
    return NextResponse.json({
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      webViewLink: attachment.webViewLink,
      isMock: true,
      recordCode: attachment.record.recordCode,
      message: "Secure document stream verified. File is stored securely in vault.",
    });
  } catch (error: any) {
    console.error("GET /api/files/preview error:", error);
    return NextResponse.json({ error: error.message || "Failed to preview file" }, { status: 500 });
  }
}
