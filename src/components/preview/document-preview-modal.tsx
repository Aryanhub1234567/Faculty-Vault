"use client";

import React, { useState } from "react";
import {
  X,
  FileText,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCheck,
  Shield,
  Calendar,
  BookOpen,
} from "lucide-react";

export interface PreviewAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  webViewLink?: string;
  driveFileId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface PreviewRecord {
  id: string;
  recordCode: string;
  category: string;
  createdAt: string;
  academicSession?: { name: string };
  facultyProfile?: { name: string; facultyId: string; department?: string };
  conferenceDetails?: any;
  patentDetails?: any;
  fdpDetails?: any;
  researchArticleDetails?: any;
  bookChapterDetails?: any;
  bookDetails?: any;
  attachments?: PreviewAttachment[];
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PreviewRecord | null;
  selectedAttachmentIndex?: number;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  record,
  selectedAttachmentIndex = 0,
}: DocumentPreviewModalProps) {
  const [activeAttachmentIdx, setActiveAttachmentIdx] = useState(selectedAttachmentIndex);
  const [zoomLevel, setZoomLevel] = useState(100);

  if (!isOpen || !record) return null;

  const attachments = record.attachments || [];
  const currentAttachment = attachments[activeAttachmentIdx] || attachments[0];

  const isPdf = currentAttachment?.mimeType === "application/pdf" || currentAttachment?.fileName.endsWith(".pdf");
  const isImage = currentAttachment?.mimeType.startsWith("image/") || /\.(jpg|jpeg|png)$/i.test(currentAttachment?.fileName || "");
  const isDoc = currentAttachment?.mimeType.includes("word") || /\.(doc|docx)$/i.test(currentAttachment?.fileName || "");

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[88vh] bg-[var(--surface-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--surface-deep)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  {currentAttachment?.fileName || "Document Preview"}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[var(--surface-elevated)] border border-[var(--border-color)] text-emerald-400">
                  {record.recordCode}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {formatFileSize(currentAttachment?.fileSize || 0)} • {record.academicSession?.name} • {record.category.replace("_", " ")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls for Images & PDFs */}
            {(isImage || isPdf) && (
              <div className="flex items-center gap-1 px-2 py-1 bg-[var(--surface-elevated)] rounded-lg border border-[var(--border-color)] text-xs">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                  className="p-1 text-[var(--text-secondary)] hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1 text-[11px] font-mono text-[var(--text-muted)]">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
                  className="p-1 text-[var(--text-secondary)] hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Open in Drive action */}
            {currentAttachment?.webViewLink && (
              <a
                href={currentAttachment.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Drive</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-[var(--text-secondary)] hover:text-white rounded-lg hover:bg-[var(--surface-elevated)] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Preview, Right Metadata Panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Document Viewer Canvas */}
          <div className="flex-1 flex items-center justify-center bg-[var(--surface-deep)] p-4 overflow-auto">
            {isPdf ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                {currentAttachment.webViewLink && !currentAttachment.webViewLink.includes("mock_") ? (
                  <iframe
                    src={currentAttachment.webViewLink.replace("/view", "/preview")}
                    className="w-full h-full rounded-xl border border-[var(--border-color)] shadow-inner"
                    title={currentAttachment.fileName}
                  />
                ) : (
                  <div
                    className="w-full max-w-2xl h-full max-h-[600px] flex flex-col items-center justify-center p-8 text-center rounded-xl border border-[var(--border-color)] bg-[var(--surface-main)] shadow-xl transition-transform"
                    style={{ transform: `scale(${zoomLevel / 100})` }}
                  >
                    <FileText className="w-16 h-16 text-emerald-400 mb-4 animate-pulse" />
                    <h3 className="text-base font-semibold text-white mb-1">
                      {currentAttachment.fileName}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] max-w-md mb-6">
                      Secure in-app PDF document container. Stored in institutional vault under record{" "}
                      <span className="font-mono text-emerald-400">{record.recordCode}</span>.
                    </p>
                    <a
                      href={`/api/files/${currentAttachment.id}/preview`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      Download Verified PDF
                    </a>
                  </div>
                )}
              </div>
            ) : isImage ? (
              <div
                className="flex items-center justify-center transition-transform max-w-full max-h-full"
                style={{ transform: `scale(${zoomLevel / 100})` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    currentAttachment.webViewLink && !currentAttachment.webViewLink.includes("mock_")
                      ? currentAttachment.webViewLink
                      : `https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1200&auto=format&fit=crop&q=80`
                  }
                  alt={currentAttachment.fileName}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl border border-[var(--border-color)]"
                />
              </div>
            ) : isDoc ? (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--surface-main)] shadow-xl">
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4">
                  <FileText className="w-12 h-12" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{currentAttachment.fileName}</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-6">
                  Microsoft Word documents (DOC/DOCX) are securely stored in the institutional Google Drive record folder. Use Google Drive preview or download directly.
                </p>
                <div className="flex items-center gap-3">
                  {currentAttachment.webViewLink && (
                    <a
                      href={currentAttachment.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-md"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in Drive Preview
                    </a>
                  )}
                  <a
                    href={`/api/files/${currentAttachment.id}/preview`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-color)] text-white hover:border-emerald-500/30 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download File
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 text-xs text-[var(--text-muted)]">
                No attachments uploaded for this record.
              </div>
            )}
          </div>

          {/* Right Sidebar: Metadata & Attachments List */}
          <div className="w-80 border-l border-[var(--border-color)] bg-[var(--surface-main)] flex flex-col justify-between overflow-y-auto p-5">
            <div className="space-y-5">
              <div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-[var(--text-muted)]">
                  Record Metadata
                </span>
                <div className="mt-3 space-y-3">
                  <div>
                    <span className="text-[11px] text-[var(--text-secondary)]">Faculty Member</span>
                    <p className="text-xs font-semibold text-white">
                      {record.facultyProfile?.name} ({record.facultyProfile?.facultyId})
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-[var(--text-secondary)]">Academic Session</span>
                    <p className="text-xs font-medium text-emerald-400 font-mono">
                      {record.academicSession?.name}
                    </p>
                  </div>

                  {/* Books Specific Metadata (ISBN & Date Requirement) */}
                  {record.category === "BOOK" && record.bookDetails && (
                    <>
                      <div>
                        <span className="text-[11px] text-[var(--text-secondary)]">Book Status</span>
                        <p className="text-xs font-medium text-white">
                          {record.bookDetails.status === "AUTHORED" ? "Authored Monograph" : "Edited Volume"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] text-[var(--text-secondary)]">ISBN Number</span>
                        <p className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                          {record.bookDetails.isbn}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] text-[var(--text-secondary)]">Publication Date</span>
                        <p className="text-xs text-white">
                          {record.bookDetails.date ? new Date(record.bookDetails.date).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Conference details */}
                  {record.conferenceDetails && (
                    <div>
                      <span className="text-[11px] text-[var(--text-secondary)]">Organizer & Scope</span>
                      <p className="text-xs text-white">
                        {record.conferenceDetails.organizer} ({record.conferenceDetails.nationality})
                      </p>
                    </div>
                  )}

                  {/* Patent details */}
                  {record.patentDetails && (
                    <div>
                      <span className="text-[11px] text-[var(--text-secondary)]">Patent Type & Status</span>
                      <p className="text-xs text-white">
                        {record.patentDetails.type} • {record.patentDetails.status}
                      </p>
                    </div>
                  )}

                  {/* Research article details */}
                  {record.researchArticleDetails && (
                    <div>
                      <span className="text-[11px] text-[var(--text-secondary)]">Publisher & Indexing</span>
                      <p className="text-xs text-white">
                        {record.researchArticleDetails.publisher} (
                        <span className="text-emerald-400 font-semibold">
                          {record.researchArticleDetails.indexing}
                        </span>
                        )
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Attachments Switcher if multi-file */}
              {attachments.length > 1 && (
                <div className="pt-4 border-t border-[var(--border-color)]">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-[var(--text-muted)]">
                    All Files ({attachments.length})
                  </span>
                  <div className="mt-2 space-y-1.5">
                    {attachments.map((att, idx) => (
                      <button
                        key={att.id}
                        onClick={() => setActiveAttachmentIdx(idx)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-all ${
                          idx === activeAttachmentIdx
                            ? "bg-emerald-500/10 border border-emerald-500/30 text-white font-medium"
                            : "bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] text-[var(--text-secondary)]"
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                        <span className="truncate flex-1">{att.fileName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] text-[11px] text-[var(--text-muted)] flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Drive Protected Storage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
