import { prisma } from "@/lib/db/prisma";
import {
  getOrCreateDriveFolder,
  buildCategorySubpath,
  uploadFileToDrive,
  sanitizeFolderName,
} from "@/lib/google/drive";
import { queueSheetSyncJob, processSheetSyncJob } from "@/lib/google/sheets";
import { validateFile } from "@/lib/validations/records";

export interface RecordQueryParams {
  facultyProfileId?: string;
  academicSessionId?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  isAdmin?: boolean;
  // Specific filters
  nationality?: string;
  patentType?: string;
  patentStatus?: string;
  indexing?: string;
  bookStatus?: string;
}

export interface CreateRecordInput {
  userId: string;
  category: "CONFERENCE" | "PATENT" | "FDP" | "RESEARCH_ARTICLE" | "BOOK_CHAPTER" | "BOOK";
  academicSessionId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: Record<string, any>;
  files?: Array<{
    name: string;
    buffer: Buffer;
    mimeType: string;
    size: number;
  }>;
}

export class RecordsService {
  /**
   * Generates a clean, unique record code for institutional tracking
   */
  private static async generateRecordCode(category: string): Promise<string> {
    const prefixes: Record<string, string> = {
      CONFERENCE: "CONF",
      PATENT: "PAT",
      FDP: "FDP",
      RESEARCH_ARTICLE: "RES",
      BOOK_CHAPTER: "CHAP",
      BOOK: "BOOK",
    };
    const prefix = prefixes[category] || "REC";
    const timestamp = Date.now().toString().slice(-4);
    const count = await prisma.record.count({
      where: { category: category as any },
    });
    return `REC-${prefix}-${(count + 1).toString().padStart(4, "0")}`;
  }

  /**
   * Fetch records with role-based scoping, session filtering, and category-specific search
   */
  static async getRecords(params: RecordQueryParams) {
    const {
      facultyProfileId,
      academicSessionId,
      category,
      search,
      page = 1,
      limit = 10,
      isAdmin = false,
      nationality,
      patentType,
      patentStatus,
      indexing,
      bookStatus,
    } = params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      deletedAt: null, // Soft deletion filter
    };

    // Role-based access control:
    // Non-admin faculty MUST only see their own records
    if (!isAdmin || facultyProfileId) {
      if (facultyProfileId) {
        where.facultyProfileId = facultyProfileId;
      }
    }

    if (academicSessionId) {
      where.academicSessionId = academicSessionId;
    }

    if (category) {
      where.category = category;
    }

    // Category-specific filters
    if (nationality && category === "CONFERENCE") {
      where.conferenceDetails = { nationality };
    }
    if (category === "PATENT") {
      if (patentType) where.patentDetails = { ...(where.patentDetails || {}), type: patentType };
      if (patentStatus) where.patentDetails = { ...(where.patentDetails || {}), status: patentStatus };
    }
    if (indexing && category === "RESEARCH_ARTICLE") {
      where.researchArticleDetails = { indexing };
    }
    if (bookStatus && category === "BOOK") {
      where.bookDetails = { status: bookStatus };
    }

    // Search query
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { recordCode: { contains: q } },
        { conferenceDetails: { title: { contains: q } } },
        { conferenceDetails: { topic: { contains: q } } },
        { conferenceDetails: { organizer: { contains: q } } },
        { patentDetails: { title: { contains: q } } },
        { fdpDetails: { topic: { contains: q } } },
        { fdpDetails: { organizer: { contains: q } } },
        { researchArticleDetails: { title: { contains: q } } },
        { researchArticleDetails: { publisher: { contains: q } } },
        { bookChapterDetails: { title: { contains: q } } },
        { bookChapterDetails: { topic: { contains: q } } },
        { bookDetails: { title: { contains: q } } },
        { bookDetails: { topic: { contains: q } } },
        { bookDetails: { isbn: { contains: q } } }, // Search by ISBN
        ...(isAdmin
          ? [
              { facultyProfile: { name: { contains: q } } },
              { facultyProfile: { facultyId: { contains: q } } },
              { facultyProfile: { email: { contains: q } } },
            ]
          : []),
      ];
    }

    const total = await prisma.record.count({ where });
    const records = await prisma.record.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        facultyProfile: {
          select: {
            id: true,
            name: true,
            facultyId: true,
            email: true,
            department: true,
            designation: true,
            institute: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        academicSession: {
          select: { id: true, name: true, isCurrent: true },
        },
        conferenceDetails: true,
        patentDetails: true,
        fdpDetails: true,
        researchArticleDetails: true,
        bookChapterDetails: true,
        bookDetails: true,
        attachments: true,
      },
    });

    return {
      records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetch a single record with ownership and permission checks
   */
  static async getRecordById(id: string, userProfileId?: string, isAdmin = false) {
    const record = await prisma.record.findUnique({
      where: { id },
      include: {
        facultyProfile: {
          include: { institute: true },
        },
        academicSession: true,
        conferenceDetails: true,
        patentDetails: true,
        fdpDetails: true,
        researchArticleDetails: true,
        bookChapterDetails: true,
        bookDetails: true,
        attachments: true,
        sheetSyncJobs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!record || record.deletedAt) {
      return null;
    }

    // Authorization check
    if (!isAdmin && record.facultyProfileId !== userProfileId) {
      throw new Error("Unauthorized: You do not have permission to view this record");
    }

    return record;
  }

  /**
   * Create an academic record across any of the 6 modules with Drive storage & Sheets sync
   */
  static async createRecord(input: CreateRecordInput) {
    const { userId, category, academicSessionId, details, files = [] } = input;

    // 1. Get faculty profile for user
    const facultyProfile = await prisma.facultyProfile.findUnique({
      where: { userId },
      include: { institute: true },
    });

    if (!facultyProfile) {
      throw new Error("User does not have an approved faculty profile. Complete onboarding first.");
    }

    const session = await prisma.academicSession.findUnique({
      where: { id: academicSessionId },
    });

    if (!session) {
      throw new Error("Academic session not found");
    }

    // 2. Validate all attached files
    for (const f of files) {
      const val = validateFile({ name: f.name, size: f.size, type: f.mimeType });
      if (!val.valid) {
        throw new Error(`File validation failed for "${f.name}": ${val.error}`);
      }
    }

    // 3. Generate unique record code
    const recordCode = await this.generateRecordCode(category);

    // 4. Resolve Drive folder path
    // Format: Faculty Vault / Institute / FacultyID_FacultyName / AcademicSession / CategorySubpath / RecordCode_Title
    const titleSnippet = sanitizeFolderName(details.title || details.topic || "Record").slice(0, 40);
    const facultyFolderName = `${sanitizeFolderName(facultyProfile.facultyId)}_${sanitizeFolderName(facultyProfile.name)}`;
    const categorySubpath = buildCategorySubpath(category, {
      nationality: details.nationality,
      type: details.type || details.indexing,
      status: details.status,
    });

    const fullFolderPath = `Faculty Vault/${sanitizeFolderName(facultyProfile.institute.name)}/${facultyFolderName}/${session.name}/${categorySubpath}/${recordCode}_${titleSnippet}`;

    const driveFolderInfo = await getOrCreateDriveFolder(fullFolderPath, {
      instituteId: facultyProfile.instituteId,
      facultyProfileId: facultyProfile.id,
      academicSessionId: session.id,
      category,
    });

    // 5. Upload files to Drive record folder
    const uploadedAttachments: Array<{
      fileName: string;
      mimeType: string;
      fileSize: number;
      driveFileId?: string;
      webViewLink?: string;
    }> = [];

    for (const f of files) {
      const uploadResult = await uploadFileToDrive(f.buffer, f.name, f.mimeType, driveFolderInfo.folderId);
      uploadedAttachments.push({
        fileName: uploadResult.fileName,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        driveFileId: uploadResult.fileId,
        webViewLink: uploadResult.webViewLink,
      });
    }

    // 6. Persist record and category details in PostgreSQL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createData: any = {
      recordCode,
      facultyProfileId: facultyProfile.id,
      academicSessionId: session.id,
      category,
      createdById: userId,
      recordFolderDriveId: driveFolderInfo.folderId,
      recordFolderWebViewLink: driveFolderInfo.webViewLink,
      attachments: {
        create: uploadedAttachments,
      },
    };

    // Category-specific details
    switch (category) {
      case "CONFERENCE":
        createData.conferenceDetails = {
          create: {
            title: details.title,
            topic: details.topic,
            organizer: details.organizer,
            fromDate: new Date(details.fromDate),
            toDate: new Date(details.toDate),
            nationality: details.nationality,
          },
        };
        break;

      case "PATENT":
        createData.patentDetails = {
          create: {
            type: details.type,
            title: details.title,
            dateOfApply: new Date(details.dateOfApply),
            dateOfIssue: details.dateOfIssue ? new Date(details.dateOfIssue) : null,
            status: details.status,
          },
        };
        break;

      case "FDP":
        createData.fdpDetails = {
          create: {
            topic: details.topic,
            organizer: details.organizer,
            fromDate: new Date(details.fromDate),
            toDate: new Date(details.toDate),
          },
        };
        break;

      case "RESEARCH_ARTICLE":
        createData.researchArticleDetails = {
          create: {
            title: details.title,
            publisher: details.publisher,
            indexing: details.indexing,
          },
        };
        break;

      case "BOOK_CHAPTER":
        createData.bookChapterDetails = {
          create: {
            title: details.title,
            topic: details.topic,
            date: new Date(details.date),
          },
        };
        break;

      case "BOOK":
        createData.bookDetails = {
          create: {
            status: details.status,
            topic: details.topic,
            title: details.title,
            isbn: String(details.isbn).trim(), // Preserved as string
            date: new Date(details.date), // Stored as specific date
          },
        };
        break;
    }

    const record = await prisma.record.create({
      data: createData,
      include: {
        facultyProfile: true,
        academicSession: true,
        conferenceDetails: true,
        patentDetails: true,
        fdpDetails: true,
        researchArticleDetails: true,
        bookChapterDetails: true,
        bookDetails: true,
        attachments: true,
      },
    });

    // 7. Enqueue Google Sheets synchronization
    const syncJob = await queueSheetSyncJob(record.id, category, "CREATE");

    // Asynchronously trigger sync job
    processSheetSyncJob(syncJob.id).catch((err) =>
      console.warn("Async sheet sync notice:", err.message)
    );

    // 8. Log audit trail
    await prisma.auditLog.create({
      data: {
        userId,
        action: "RECORD_CREATE",
        entityType: "Record",
        entityId: record.id,
        details: JSON.stringify({ recordCode, category, title: details.title || details.topic }),
      },
    });

    return record;
  }

  /**
   * Update category-specific metadata and optionally attach new files
   */
  static async updateRecord(
    id: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details: Record<string, any>,
    userProfileId?: string,
    isAdmin = false,
    newFiles: Array<{
      name: string;
      buffer: Buffer;
      mimeType: string;
      size: number;
    }> = []
  ) {
    const existing = await prisma.record.findUnique({
      where: { id },
      include: {
        facultyProfile: { include: { institute: true } },
        academicSession: true,
      },
    });

    if (!existing || existing.deletedAt) {
      throw new Error("Record not found");
    }

    if (!isAdmin && existing.facultyProfileId !== userProfileId) {
      throw new Error("Unauthorized to edit this record");
    }

    // Upload new attachments if any provided
    if (newFiles.length > 0 && existing.recordFolderDriveId) {
      for (const f of newFiles) {
        const val = validateFile({ name: f.name, size: f.size, type: f.mimeType });
        if (!val.valid) throw new Error(val.error);

        const upload = await uploadFileToDrive(f.buffer, f.name, f.mimeType, existing.recordFolderDriveId);
        await prisma.attachment.create({
          data: {
            recordId: id,
            fileName: upload.fileName,
            mimeType: upload.mimeType,
            fileSize: upload.fileSize,
            driveFileId: upload.fileId,
            webViewLink: upload.webViewLink,
          },
        });
      }
    }

    // Update category-specific details
    switch (existing.category) {
      case "CONFERENCE":
        await prisma.conferenceDetails.update({
          where: { recordId: id },
          data: {
            title: details.title,
            topic: details.topic,
            organizer: details.organizer,
            fromDate: details.fromDate ? new Date(details.fromDate) : undefined,
            toDate: details.toDate ? new Date(details.toDate) : undefined,
            nationality: details.nationality,
          },
        });
        break;

      case "PATENT":
        await prisma.patentDetails.update({
          where: { recordId: id },
          data: {
            type: details.type,
            title: details.title,
            dateOfApply: details.dateOfApply ? new Date(details.dateOfApply) : undefined,
            dateOfIssue: details.dateOfIssue ? new Date(details.dateOfIssue) : null,
            status: details.status,
          },
        });
        break;

      case "FDP":
        await (prisma as any).fDPDetails.update({
          where: { recordId: id },
          data: {
            topic: details.topic,
            organizer: details.organizer,
            fromDate: details.fromDate ? new Date(details.fromDate) : undefined,
            toDate: details.toDate ? new Date(details.toDate) : undefined,
          },
        });
        break;

      case "RESEARCH_ARTICLE":
        await prisma.researchArticleDetails.update({
          where: { recordId: id },
          data: {
            title: details.title,
            publisher: details.publisher,
            indexing: details.indexing,
          },
        });
        break;

      case "BOOK_CHAPTER":
        await prisma.bookChapterDetails.update({
          where: { recordId: id },
          data: {
            title: details.title,
            topic: details.topic,
            date: details.date ? new Date(details.date) : undefined,
          },
        });
        break;

      case "BOOK":
        await prisma.bookDetails.update({
          where: { recordId: id },
          data: {
            status: details.status,
            topic: details.topic,
            title: details.title,
            isbn: details.isbn ? String(details.isbn).trim() : undefined,
            date: details.date ? new Date(details.date) : undefined,
          },
        });
        break;
    }

    // Touch record updatedAt
    const updated = await prisma.record.update({
      where: { id },
      data: { updatedAt: new Date() },
      include: {
        facultyProfile: true,
        academicSession: true,
        conferenceDetails: true,
        patentDetails: true,
        fdpDetails: true,
        researchArticleDetails: true,
        bookChapterDetails: true,
        bookDetails: true,
        attachments: true,
      },
    });

    // Queue Google Sheets update (overwriting same row by Record ID)
    const syncJob = await queueSheetSyncJob(id, existing.category as any, "UPDATE");
    processSheetSyncJob(syncJob.id).catch((err) =>
      console.warn("Async sheet sync notice:", err.message)
    );

    return updated;
  }

  /**
   * Soft-delete record
   */
  static async deleteRecord(id: string, userProfileId?: string, isAdmin = false) {
    const record = await prisma.record.findUnique({ where: { id } });
    if (!record || record.deletedAt) {
      throw new Error("Record not found");
    }

    if (!isAdmin && record.facultyProfileId !== userProfileId) {
      throw new Error("Unauthorized to delete this record");
    }

    const deleted = await prisma.record.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Queue Sheets synchronization for deletion
    const syncJob = await queueSheetSyncJob(id, record.category as any, "DELETE");
    processSheetSyncJob(syncJob.id).catch((err) =>
      console.warn("Async sheet sync notice:", err.message)
    );

    return deleted;
  }
}
