"use client";

import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recordCode: string;
  title: string;
  isDeleting: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  recordCode,
  title,
  isDeleting,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[var(--surface-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Confirm Soft Deletion</h3>
            <p className="text-xs text-[var(--text-secondary)] font-mono font-semibold">{recordCode}</p>
          </div>
        </div>

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Are you sure you want to delete <span className="text-white font-bold">"{title}"</span>?
          This will apply institutional soft deletion, preserve historical audit logs, and synchronize the deleted status to Google Sheets reporting.
        </p>

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-[var(--surface-elevated)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50 transition-all shadow-md hover:scale-[1.02] active:scale-[0.99]"
          >
            {isDeleting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>Delete Record</span>
          </button>
        </div>
      </div>
    </div>
  );
}
