"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  File,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Paperclip,
  Calendar,
  Layers,
  BookOpen,
  Award,
  Presentation,
  FileText,
  GraduationCap,
  Bookmark,
} from "lucide-react";
import { useAcademicSession } from "@/components/layout/session-context";
import { ALLOWED_EXTENSIONS } from "@/lib/validations/records";
import { toast } from "sonner";

interface RecordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: "CONFERENCE" | "PATENT" | "FDP" | "RESEARCH_ARTICLE" | "BOOK_CHAPTER" | "BOOK";
  onSuccess: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any; // For editing existing record
}

const categoryIcons = {
  CONFERENCE: Presentation,
  PATENT: Award,
  FDP: GraduationCap,
  RESEARCH_ARTICLE: FileText,
  BOOK_CHAPTER: Bookmark,
  BOOK: BookOpen,
};

const categoryTitles = {
  CONFERENCE: "Conference Record",
  PATENT: "Patent Record",
  FDP: "Faculty Development Program (FDP)",
  RESEARCH_ARTICLE: "Research Article Publication",
  BOOK_CHAPTER: "Book Chapter Contribution",
  BOOK: "Academic Book / Monograph",
};

export function RecordFormModal({
  isOpen,
  onClose,
  category,
  onSuccess,
  initialData,
}: RecordFormModalProps) {
  const { selectedSession } = useAcademicSession();
  const isEditing = Boolean(initialData);

  // Form states
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      // Extract details according to category
      let details = {};
      if (category === "CONFERENCE") details = initialData.conferenceDetails || {};
      else if (category === "PATENT") details = initialData.patentDetails || {};
      else if (category === "FDP") details = initialData.fdpDetails || {};
      else if (category === "RESEARCH_ARTICLE") details = initialData.researchArticleDetails || {};
      else if (category === "BOOK_CHAPTER") details = initialData.bookChapterDetails || {};
      else if (category === "BOOK") details = initialData.bookDetails || {};

      // Format date fields for HTML input[type="date"]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted: Record<string, any> = { ...details };
      ["fromDate", "toDate", "dateOfApply", "dateOfIssue", "date"].forEach((dField) => {
        if (formatted[dField]) {
          formatted[dField] = new Date(formatted[dField]).toISOString().split("T")[0];
        }
      });

      setFormData(formatted);
    } else {
      // Clean default state
      if (category === "CONFERENCE") {
        setFormData({ nationality: "NATIONAL" });
      } else if (category === "PATENT") {
        setFormData({ type: "UTILITY", status: "PUBLISH" });
      } else if (category === "RESEARCH_ARTICLE") {
        setFormData({ indexing: "SCOPUS" });
      } else if (category === "BOOK") {
        setFormData({ status: "AUTHORED" });
      } else {
        setFormData({});
      }
      setFiles([]);
    }
    setErrorMsg(null);
  }, [initialData, category, isOpen]);

  if (!isOpen) return null;

  const Icon = categoryIcons[category] || FileText;

  // File drop/selection handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      const invalidFiles: string[] = [];

      selected.forEach((f) => {
        const ext = f.name.split(".").pop()?.toLowerCase();
        if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
          invalidFiles.push(f.name);
        }
      });

      if (invalidFiles.length > 0) {
        toast.error(`Invalid format for: ${invalidFiles.join(", ")}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`);
        return;
      }

      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) {
      toast.error("Please select an academic session first");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const payload = new FormData();
      payload.append("category", category);
      payload.append("academicSessionId", selectedSession.id);
      payload.append("details", JSON.stringify(formData));

      files.forEach((file) => {
        payload.append("files", file);
      });

      const endpoint = isEditing ? `/api/records/${initialData.id}` : "/api/records";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        body: payload,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save record");
      }

      toast.success(isEditing ? "Record updated successfully!" : "Record created and saved to Google Drive!");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Save record error:", err);
      setErrorMsg(err.message || "An unexpected error occurred");
      toast.error(err.message || "Failed to save record");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[92vh] bg-[var(--surface-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--surface-deep)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {isEditing ? `Edit ${categoryTitles[category]}` : `New ${categoryTitles[category]}`}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Session: <span className="text-emerald-400 font-mono font-medium">{selectedSession?.name}</span> • Stored in Institutional Shared Drive
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-secondary)] hover:text-white rounded-lg hover:bg-[var(--surface-elevated)] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Category-Specific Form Fields */}
          <div className="space-y-4">
            {/* 1. CONFERENCE */}
            {category === "CONFERENCE" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Paper / Presentation Title <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title || ""}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Distributed Consensus in Ultra-Dense Wireless Sensor Networks"
                    className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Conference Topic / Domain <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.topic || ""}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      placeholder="e.g. Distributed Computing & IoT"
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Organizer <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.organizer || ""}
                      onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                      placeholder="e.g. IEEE Communications Society"
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Start Date (From) <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.fromDate || ""}
                      onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      End Date (To) <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.toDate || ""}
                      onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Nationality <span className="text-emerald-400">*</span>
                    </label>
                    <select
                      value={formData.nationality || "NATIONAL"}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="NATIONAL">National</option>
                      <option value="INTERNATIONAL">International</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* 2. PATENT */}
            {category === "PATENT" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Patent Type <span className="text-emerald-400">*</span>
                    </label>
                    <select
                      value={formData.type || "UTILITY"}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="DESIGN">Design Patent</option>
                      <option value="UTILITY">Utility Patent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Patent Status <span className="text-emerald-400">*</span>
                    </label>
                    <select
                      value={formData.status || "PUBLISH"}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="PUBLISH">Published (Application)</option>
                      <option value="GRANT">Granted</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Patent Title <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title || ""}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Real-Time Hardware Accelerator for Deep Neural Network Inference"
                    className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Date of Application / Filing <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.dateOfApply || ""}
                      onChange={(e) => setFormData({ ...formData, dateOfApply: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Date of Issue (if Granted)
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfIssue || ""}
                      onChange={(e) => setFormData({ ...formData, dateOfIssue: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            {/* 3. FDP */}
            {category === "FDP" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    FDP / Workshop Topic <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.topic || ""}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="e.g. Next-Generation Cybersecurity & Threat Modeling in Cyber-Physical Systems"
                    className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Organizing Institute / Agency <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.organizer || ""}
                    onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                    placeholder="e.g. IIT Delhi & AICTE Training and Learning (ATAL) Academy"
                    className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      From (Start Date) <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.fromDate || ""}
                      onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      To (End Date) <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.toDate || ""}
                      onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            {/* 4. RESEARCH ARTICLES */}
            {category === "RESEARCH_ARTICLE" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Article Title <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title || ""}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Secure Multi-Party Computation for Federated Edge Learning"
                    className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Publisher / Journal Name <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.publisher || ""}
                      onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                      placeholder="e.g. IEEE Transactions on Information Forensics and Security"
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Indexing <span className="text-emerald-400">*</span>
                    </label>
                    <select
                      value={formData.indexing || "SCOPUS"}
                      onChange={(e) => setFormData({ ...formData, indexing: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="SCOPUS">SCOPUS</option>
                      <option value="WOS">Web of Science (WOS)</option>
                      <option value="SCI">Science Citation Index (SCI)</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* 5. BOOK CHAPTERS */}
            {category === "BOOK_CHAPTER" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Chapter Title <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title || ""}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Privacy-Preserving Analytics in Smart Healthcare Architectures"
                    className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Book Title / Topic <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.topic || ""}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      placeholder="e.g. Modern Frontiers in Distributed Healthcare Systems"
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Publication Date <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date || ""}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            {/* 6. BOOKS - STRICT REQUIREMENTS FOR STATUS, TOPIC, TITLE, ISBN (STRING), DATE */}
            {category === "BOOK" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Book Status <span className="text-emerald-400">*</span>
                    </label>
                    <select
                      value={formData.status || "AUTHORED"}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="AUTHORED">Authored Monograph</option>
                      <option value="EDIT">Edited Volume</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      ISBN (String) <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.isbn || ""}
                      onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                      placeholder="e.g. 978-0-13-468599-1"
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                      Stored as string to preserve leading zeros & hyphens.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Book Title <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title || ""}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Principles of High-Performance Distributed Computing"
                    className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Topic / Subject Area <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.topic || ""}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      placeholder="e.g. Distributed Computing & Cloud Infrastructure"
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Publication Date <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date || ""}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Existing Attachments in Edit Mode */}
          {isEditing && initialData.attachments && initialData.attachments.length > 0 && (
            <div className="pt-4 border-t border-[var(--border-color)]">
              <span className="text-xs font-medium text-[var(--text-secondary)] mb-2 block">
                Existing Attachments in Google Drive ({initialData.attachments.length})
              </span>
              <div className="space-y-1.5">
                {initialData.attachments.map((att: any) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-deep)] border border-[var(--border-color)] text-xs"
                  >
                    <div className="flex items-center gap-2 text-white">
                      <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="truncate">{att.fileName}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">Retained</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Upload Dropzone */}
          <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              {isEditing ? "Add More Attachments (Optional)" : "Academic Documents & Proofs"}
            </label>

            <label className="group relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--border-color)] hover:border-emerald-500/50 rounded-xl bg-[var(--surface-deep)]/50 cursor-pointer transition-all">
              <Upload className="w-8 h-8 text-[var(--text-muted)] group-hover:text-emerald-400 transition-colors mb-2" />
              <p className="text-xs font-medium text-white group-hover:text-emerald-400 transition-colors">
                Click or drag & drop files here
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                PDF, DOC, DOCX, JPG, JPEG, PNG (Up to 25MB each)
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* Selected files list */}
            {files.length > 0 && (
              <div className="space-y-2 mt-3">
                <span className="text-[11px] font-medium text-[var(--text-muted)]">
                  Staged for Upload ({files.length}):
                </span>
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-color)] text-xs"
                  >
                    <div className="flex items-center gap-2 truncate text-white">
                      <File className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--surface-elevated)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/10"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Syncing with Drive...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>{isEditing ? "Save Changes" : "Save Record"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
