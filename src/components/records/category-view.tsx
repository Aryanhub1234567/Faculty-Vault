"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Plus,
  FileText,
  Eye,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Folder,
  Layers,
  Sparkles,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import { useAcademicSession } from "@/components/layout/session-context";
import { RecordFormModal } from "./record-form-modal";
import { DeleteConfirmModal } from "./delete-confirm-modal";
import { DocumentPreviewModal, PreviewRecord } from "@/components/preview/document-preview-modal";
import { toast } from "sonner";
import { format } from "date-fns";

export interface CategoryViewProps {
  category: "CONFERENCE" | "PATENT" | "FDP" | "RESEARCH_ARTICLE" | "BOOK_CHAPTER" | "BOOK";
  title: string;
  description: string;
  icon: React.ElementType;
}

export function CategoryView({
  category,
  title,
  description,
  icon: Icon,
}: CategoryViewProps) {
  const { selectedSession } = useAcademicSession();

  // Data & query states
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Category specific filters
  const [filterNationality, setFilterNationality] = useState("");
  const [filterPatentType, setFilterPatentType] = useState("");
  const [filterPatentStatus, setFilterPatentStatus] = useState("");
  const [filterIndexing, setFilterIndexing] = useState("");
  const [filterBookStatus, setFilterBookStatus] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deletingRecord, setDeletingRecord] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<PreviewRecord | null>(null);

  // Fetch records
  const fetchRecords = useCallback(async () => {
    if (!selectedSession) return;
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        category,
        academicSessionId: selectedSession.id,
        page: page.toString(),
        limit: "10",
      });

      if (search.trim()) params.append("search", search.trim());
      if (filterNationality) params.append("nationality", filterNationality);
      if (filterPatentType) params.append("patentType", filterPatentType);
      if (filterPatentStatus) params.append("patentStatus", filterPatentStatus);
      if (filterIndexing) params.append("indexing", filterIndexing);
      if (filterBookStatus) params.append("bookStatus", filterBookStatus);

      const res = await fetch(`/api/records?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error("Failed to fetch records:", err);
      toast.error("Failed to load records");
    } finally {
      setIsLoading(false);
    }
  }, [
    category,
    selectedSession,
    page,
    search,
    filterNationality,
    filterPatentType,
    filterPatentStatus,
    filterIndexing,
    filterBookStatus,
  ]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/records/${deletingRecord.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Record deleted successfully");
        setDeletingRecord(null);
        fetchRecords();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete record");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)]">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-950/40 border border-emerald-500/30 text-emerald-400">
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
              <span className="px-2.5 py-0.5 text-xs font-mono font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {pagination.total} {pagination.total === 1 ? "Record" : "Records"}
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRecords()}
            className="p-2.5 text-[var(--text-secondary)] hover:text-white rounded-xl hover:bg-[var(--surface-elevated)] border border-[var(--border-color)] transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => {
              setEditingRecord(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/10 transition-all hover:scale-[1.02] active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Record</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[var(--surface-deep)] border border-[var(--border-color)]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder={`Search by title, topic, ${category === "BOOK" ? "ISBN, " : ""}or keywords...`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Category Specific Filter Selects */}
        <div className="flex items-center gap-2.5 overflow-x-auto">
          {category === "CONFERENCE" && (
            <select
              value={filterNationality}
              onChange={(e) => {
                setFilterNationality(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">All Nationalities</option>
              <option value="NATIONAL">National</option>
              <option value="INTERNATIONAL">International</option>
            </select>
          )}

          {category === "PATENT" && (
            <>
              <select
                value={filterPatentType}
                onChange={(e) => {
                  setFilterPatentType(e.target.value);
                  setPage(1);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">All Patent Types</option>
                <option value="DESIGN">Design</option>
                <option value="UTILITY">Utility</option>
              </select>

              <select
                value={filterPatentStatus}
                onChange={(e) => {
                  setFilterPatentStatus(e.target.value);
                  setPage(1);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="PUBLISH">Published</option>
                <option value="GRANT">Granted</option>
              </select>
            </>
          )}

          {category === "RESEARCH_ARTICLE" && (
            <select
              value={filterIndexing}
              onChange={(e) => {
                setFilterIndexing(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">All Indexing</option>
              <option value="SCOPUS">SCOPUS</option>
              <option value="WOS">Web of Science</option>
              <option value="SCI">Science Citation Index</option>
            </select>
          )}

          {category === "BOOK" && (
            <select
              value={filterBookStatus}
              onChange={(e) => {
                setFilterBookStatus(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">All Book Types</option>
              <option value="AUTHORED">Authored</option>
              <option value="EDIT">Edited</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Records Table */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--surface-deep)] text-xs font-bold tracking-wider uppercase text-[var(--text-muted)]">
                <th className="py-3.5 px-4">Record ID</th>
                <th className="py-3.5 px-4">Details & Topic</th>
                <th className="py-3.5 px-4">Category Metadata</th>
                <th className="py-3.5 px-4">Date / Timeline</th>
                <th className="py-3.5 px-4">Files</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Loading academic records...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="p-3.5 rounded-2xl bg-[var(--surface-elevated)] text-[var(--text-muted)]">
                        <Folder className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-bold text-white">No records found</h3>
                      <p className="text-sm text-[var(--text-secondary)]">
                        No records stored in session {selectedSession?.name} for this category. Create your first record or adjust your search filter.
                      </p>
                      <button
                        onClick={() => {
                          setEditingRecord(null);
                          setIsAddModalOpen(true);
                        }}
                        className="mt-2 flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add First Record</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  // Determine display title & topic
                  let dTitle = "";
                  let dTopic = "";
                  let dMeta = "";
                  let dDate = "";

                  if (category === "CONFERENCE" && rec.conferenceDetails) {
                    dTitle = rec.conferenceDetails.title;
                    dTopic = rec.conferenceDetails.topic;
                    dMeta = `${rec.conferenceDetails.organizer} • ${rec.conferenceDetails.nationality}`;
                    dDate = `${format(new Date(rec.conferenceDetails.fromDate), "MMM d, yyyy")} - ${format(new Date(rec.conferenceDetails.toDate), "MMM d, yyyy")}`;
                  } else if (category === "PATENT" && rec.patentDetails) {
                    dTitle = rec.patentDetails.title;
                    dTopic = `Type: ${rec.patentDetails.type}`;
                    dMeta = `Status: ${rec.patentDetails.status}`;
                    dDate = `Applied: ${format(new Date(rec.patentDetails.dateOfApply), "MMM d, yyyy")}${rec.patentDetails.dateOfIssue ? ` • Issued: ${format(new Date(rec.patentDetails.dateOfIssue), "MMM d, yyyy")}` : ""}`;
                  } else if (category === "FDP" && rec.fdpDetails) {
                    dTitle = rec.fdpDetails.topic;
                    dTopic = rec.fdpDetails.organizer;
                    dMeta = `Organizer: ${rec.fdpDetails.organizer}`;
                    dDate = `${format(new Date(rec.fdpDetails.fromDate), "MMM d, yyyy")} - ${format(new Date(rec.fdpDetails.toDate), "MMM d, yyyy")}`;
                  } else if (category === "RESEARCH_ARTICLE" && rec.researchArticleDetails) {
                    dTitle = rec.researchArticleDetails.title;
                    dTopic = rec.researchArticleDetails.publisher;
                    dMeta = `Indexed: ${rec.researchArticleDetails.indexing}`;
                    dDate = format(new Date(rec.createdAt), "MMM d, yyyy");
                  } else if (category === "BOOK_CHAPTER" && rec.bookChapterDetails) {
                    dTitle = rec.bookChapterDetails.title;
                    dTopic = rec.bookChapterDetails.topic;
                    dMeta = "Book Chapter";
                    dDate = format(new Date(rec.bookChapterDetails.date), "MMM d, yyyy");
                  } else if (category === "BOOK" && rec.bookDetails) {
                    // Books specific requirement: display ISBN and Date
                    dTitle = rec.bookDetails.title;
                    dTopic = rec.bookDetails.topic;
                    dMeta = `${rec.bookDetails.status === "AUTHORED" ? "Authored" : "Edited"} • ISBN: ${rec.bookDetails.isbn}`;
                    dDate = format(new Date(rec.bookDetails.date), "MMM d, yyyy");
                  }

                  const attachments = rec.attachments || [];

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-[var(--surface-elevated)]/50 transition-colors group"
                    >
                      {/* Record ID */}
                      <td className="py-4 px-4 font-mono font-bold text-sm text-emerald-400">
                        {rec.recordCode}
                      </td>

                      {/* Title & Topic */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-bold text-sm text-white truncate group-hover:text-emerald-400 transition-colors">
                          {dTitle || "Untitled"}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                          {dTopic}
                        </div>
                      </td>

                      {/* Category Specific Metadata */}
                      <td className="py-4 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--surface-deep)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                          {dMeta}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">
                        {dDate}
                      </td>

                      {/* Files */}
                      <td className="py-4 px-4">
                        {attachments.length > 0 ? (
                          <button
                            onClick={() => setPreviewRecord(rec)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-all"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{attachments.length} {attachments.length === 1 ? "file" : "files"}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">No files</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewRecord(rec)}
                            className="p-2 text-[var(--text-secondary)] hover:text-white rounded-lg hover:bg-[var(--surface-elevated)] transition-colors"
                            title="Preview Record"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setEditingRecord(rec);
                              setIsAddModalOpen(true);
                            }}
                            className="p-2 text-[var(--text-secondary)] hover:text-white rounded-lg hover:bg-[var(--surface-elevated)] transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeletingRecord(rec)}
                            className="p-2 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--border-color)] bg-[var(--surface-deep)] text-sm font-medium text-[var(--text-secondary)]">
            <div>
              Page {page} of {pagination.totalPages} ({pagination.total} records)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Creation & Edit Modal */}
      <RecordFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRecord(null);
        }}
        category={category}
        initialData={editingRecord}
        onSuccess={fetchRecords}
      />

      {/* Document & Record Preview Modal */}
      <DocumentPreviewModal
        isOpen={Boolean(previewRecord)}
        onClose={() => setPreviewRecord(null)}
        record={previewRecord}
      />

      {/* Soft Deletion Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingRecord)}
        onClose={() => setDeletingRecord(null)}
        onConfirm={handleDeleteConfirm}
        recordCode={deletingRecord?.recordCode || ""}
        title={
          deletingRecord?.conferenceDetails?.title ||
          deletingRecord?.patentDetails?.title ||
          deletingRecord?.fdpDetails?.topic ||
          deletingRecord?.researchArticleDetails?.title ||
          deletingRecord?.bookChapterDetails?.title ||
          deletingRecord?.bookDetails?.title ||
          "Record"
        }
        isDeleting={isDeleting}
      />
    </div>
  );
}
