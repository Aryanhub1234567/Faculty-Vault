"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  Menu,
  Calendar,
  ChevronDown,
  Plus,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";
import { useAcademicSession } from "@/components/layout/session-context";

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenAddRecord?: () => void;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Faculty Workspace", subtitle: "Overview & Activity" },
  "/conference": { title: "Conferences", subtitle: "National & International Events" },
  "/patents": { title: "Patents", subtitle: "Design & Utility Patents" },
  "/fdp": { title: "Faculty Development Programs", subtitle: "Workshops & Training" },
  "/research-articles": { title: "Research Articles", subtitle: "SCOPUS, WOS & SCI Publications" },
  "/book-chapters": { title: "Book Chapters", subtitle: "Authored & Edited Chapters" },
  "/books": { title: "Books & Monographs", subtitle: "ISBN Publications" },
  "/profile": { title: "Faculty Profile", subtitle: "Institutional Identity" },
  "/admin": { title: "Institutional Administration", subtitle: "Governance & Reporting" },
};

export function Header({ onOpenMobileSidebar, onOpenAddRecord }: HeaderProps) {
  const pathname = usePathname();
  const { sessions, selectedSession, setSelectedSession, isLoading } = useAcademicSession();

  const currentMeta = pageTitles[pathname] || {
    title: "Faculty Vault",
    subtitle: "Academic Records Management",
  };

  const isModulePage = [
    "/conference",
    "/patents",
    "/fdp",
    "/research-articles",
    "/book-chapters",
    "/books",
  ].includes(pathname);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 border-b bg-[var(--surface-main)]/80 backdrop-blur-md border-[var(--border-color)]">
      {/* Left: Mobile hamburger + Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="flex items-center justify-center w-9 h-9 rounded-lg md:hidden text-[var(--text-secondary)] hover:text-white hover:bg-[var(--surface-elevated)] border border-[var(--border-color)]"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-white">
              {currentMeta.title}
            </h1>
            <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline-block text-xs text-[var(--text-secondary)]">
              {currentMeta.subtitle}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Academic Session Selector + Add Record button */}
      <div className="flex items-center gap-3">
        {/* Prominent Global Academic Session Selector */}
        <div className="relative flex items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-color)] hover:border-emerald-500/40 transition-all text-xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-[var(--text-muted)] hidden sm:inline">Session:</span>

            {isLoading ? (
              <span className="text-white animate-pulse">Loading...</span>
            ) : (
              <select
                aria-label="Academic session filter"
                value={selectedSession?.id || ""}
                onChange={(e) => {
                  const found = sessions.find((s) => s.id === e.target.value);
                  if (found) setSelectedSession(found);
                }}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-4 appearance-none"
              >
                {sessions.map((s) => (
                  <option
                    key={s.id}
                    value={s.id}
                    className="bg-[var(--surface-deep)] text-white"
                  >
                    {s.name} {s.isCurrent ? "★ (Current)" : ""}
                  </option>
                ))}
              </select>
            )}
            <ChevronDown className="w-3 h-3 text-[var(--text-muted)] pointer-events-none -ml-3" />
          </div>
        </div>

        {/* Quick Add Record Action for category pages */}
        {isModulePage && onOpenAddRecord && (
          <button
            onClick={onOpenAddRecord}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Record</span>
          </button>
        )}
      </div>
    </header>
  );
}
