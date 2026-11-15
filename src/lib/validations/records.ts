import { z } from "zod";

// Helper for date validation from form string / Date object
export const dateSchema = z.union([
  z.date(),
  z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }).transform((val) => new Date(val)),
]);

// 1. Conference Validation
export const conferenceSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(300),
  topic: z.string().min(2, "Topic is required").max(300),
  organizer: z.string().min(2, "Organizer is required").max(200),
  fromDate: dateSchema,
  toDate: dateSchema,
  nationality: z.enum(["NATIONAL", "INTERNATIONAL"], {
    errorMap: () => ({ message: "Select National or International" }),
  }),
}).refine((data) => new Date(data.toDate) >= new Date(data.fromDate), {
  message: "End date must be on or after start date",
  path: ["toDate"],
});

// 2. Patent Validation
export const patentSchema = z.object({
  type: z.enum(["DESIGN", "UTILITY"], {
    errorMap: () => ({ message: "Select Design or Utility" }),
  }),
  title: z.string().min(3, "Patent title is required").max(300),
  dateOfApply: dateSchema,
  dateOfIssue: dateSchema.optional().nullable(),
  status: z.enum(["PUBLISH", "GRANT"], {
    errorMap: () => ({ message: "Select Publish or Grant" }),
  }),
});

// 3. FDP Validation
export const fdpSchema = z.object({
  topic: z.string().min(3, "Topic is required").max(300),
  organizer: z.string().min(2, "Organizer is required").max(200),
  fromDate: dateSchema,
  toDate: dateSchema,
}).refine((data) => new Date(data.toDate) >= new Date(data.fromDate), {
  message: "End date must be on or after start date",
  path: ["toDate"],
});

// 4. Research Articles Validation
export const researchArticleSchema = z.object({
  title: z.string().min(3, "Article title is required").max(400),
  publisher: z.string().min(2, "Publisher is required").max(200),
  indexing: z.enum(["SCOPUS", "WOS", "SCI"], {
    errorMap: () => ({ message: "Select SCOPUS, WOS, or SCI" }),
  }),
});

// 5. Book Chapters Validation
export const bookChapterSchema = z.object({
  title: z.string().min(3, "Chapter title is required").max(300),
  topic: z.string().min(2, "Book topic/theme is required").max(300),
  date: dateSchema,
});

// 6. Books Validation
// Requirements from Section 6:
// - Status: Edit / Authored
// - Topic
// - Title
// - ISBN: Store as string, not numeric value, preserve leading zeros and formatting
// - Date: Proper date type without timezone shift
export const isbnRegex = /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/;

export const bookSchema = z.object({
  status: z.enum(["EDIT", "AUTHORED"], {
    errorMap: () => ({ message: "Select Edit or Authored" }),
  }),
  topic: z.string().min(2, "Topic is required").max(300),
  title: z.string().min(3, "Book title is required").max(300),
  isbn: z
    .string()
    .min(10, "ISBN must be at least 10 characters")
    .max(25, "ISBN must be at most 25 characters")
    .refine((val) => isbnRegex.test(val.replace(/\s+/g, "")), {
      message: "Invalid ISBN format (e.g. 978-0-13-468599-1 or 0-13-468599-7)",
    }),
  date: dateSchema,
});

// Unified Record Creation Schema
export const createRecordSchema = z.object({
  category: z.enum([
    "CONFERENCE",
    "PATENT",
    "FDP",
    "RESEARCH_ARTICLE",
    "BOOK_CHAPTER",
    "BOOK",
  ]),
  academicSessionId: z.string().min(1, "Academic session is required"),
  // Category specific payload
  conference: conferenceSchema.optional(),
  patent: patentSchema.optional(),
  fdp: fdpSchema.optional(),
  researchArticle: researchArticleSchema.optional(),
  bookChapter: bookChapterSchema.optional(),
  book: bookSchema.optional(),
});

// Faculty Onboarding Schema
export const onboardingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  facultyId: z
    .string()
    .min(2, "Faculty ID is required")
    .max(30, "Faculty ID is too long")
    .regex(/^[A-Za-z0-9-_]+$/, "Faculty ID must contain only alphanumeric characters, dashes, or underscores"),
  instituteId: z.string().min(1, "Please select an institute"),
  department: z.string().min(2, "Department is required").max(100),
  designation: z.string().min(2, "Designation is required").max(100),
  phone: z.string().max(20).optional(),
});

// Academic Session Schema
export const academicSessionSchema = z.object({
  name: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Session must be in YYYY-YY format (e.g. 2026-27)"),
  isCurrent: z.boolean().default(false),
  isActive: z.boolean().default(true),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
});

// File validation
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/jpg",
];

export const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export function validateFile(file: { name: string; size: number; type: string }) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Invalid file extension .${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== "application/octet-stream") {
    return { valid: false, error: `Unsupported MIME type ${file.type}` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds the 25MB limit` };
  }
  return { valid: true };
}
