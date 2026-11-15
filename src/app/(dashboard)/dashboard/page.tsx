"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAcademicSession } from "@/components/layout/session-context";
import {
  Presentation,
  Award,
  GraduationCap,
  FileText,
  Bookmark,
  BookOpen,
  ArrowUpRight,
  Upload,
  FileCheck,
  Calendar,
  Layers,
  Sparkles,
  ShieldAlert,
  Clock,
  HardDrive,
  FileSpreadsheet,
} from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { selectedSession } = useAcademicSession();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dashboardData, setDashboardData] = useState<any>({
    records: [],
    stats: {
      totalRecords: 0,
      totalAttachments: 0,
      categories: {
        CONFERENCE: 0,
        PATENT: 0,
        FDP: 0,
        RESEARCH_ARTICLE: 0,
        BOOK_CHAPTER: 0,
        BOOK: 0,
      },
    },
  });
  const [isLoading, setIsLoading] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any;

  useEffect(() => {
    async function loadDashboard() {
      if (!selectedSession) return;
      try {
        setIsLoading(true);
        const res = await fetch(`/api/records?academicSessionId=${selectedSession.id}&limit=6`);
        if (res.ok) {
          const data = await res.json();
          const recs = data.records || [];

          // Compute category counts for current session
          const counts: Record<string, number> = {
            CONFERENCE: 0,
            PATENT: 0,
            FDP: 0,
            RESEARCH_ARTICLE: 0,
            BOOK_CHAPTER: 0,
            BOOK: 0,
          };

          let attCount = 0;
          recs.forEach((r: any) => {
            if (counts[r.category] !== undefined) counts[r.category]++;
            attCount += r.attachments?.length || 0;
          });

          setDashboardData({
            records: recs,
            stats: {
              totalRecords: data.pagination?.total || recs.length,
              totalAttachments: attCount,
              categories: counts,
            },
          });
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, [selectedSession]);

  const categoryCards = [
    {
      title: "Conference",
      count: dashboardData.stats.categories.CONFERENCE || 0,
      href: "/conference",
      icon: Presentation,
      desc: "National & International",
      color: "from-blue-500/20 to-blue-950/40 text-blue-400 border-blue-500/30",
    },
    {
      title: "Patent",
      count: dashboardData.stats.categories.PATENT || 0,
      href: "/patents",
      icon: Award,
      desc: "Design & Utility Filings",
      color: "from-purple-500/20 to-purple-950/40 text-purple-400 border-purple-500/30",
    },
    {
      title: "FDP",
      count: dashboardData.stats.categories.FDP || 0,
      href: "/fdp",
      icon: GraduationCap,
      desc: "Faculty Training & Courses",
      color: "from-amber-500/20 to-amber-950/40 text-amber-400 border-amber-500/30",
    },
    {
      title: "Research Articles",
      count: dashboardData.stats.categories.RESEARCH_ARTICLE || 0,
      href: "/research-articles",
      icon: FileText,
      desc: "SCOPUS, WOS & SCI Journals",
      color: "from-emerald-500/20 to-emerald-950/40 text-emerald-400 border-emerald-500/30",
    },
    {
      title: "Book Chapters",
      count: dashboardData.stats.categories.BOOK_CHAPTER || 0,
      href: "/book-chapters",
      icon: Bookmark,
      desc: "Peer-Reviewed Chapters",
      color: "from-cyan-500/20 to-cyan-950/40 text-cyan-400 border-cyan-500/30",
    },
    {
      title: "Books",
      count: dashboardData.stats.categories.BOOK || 0,
      href: "/books",
      icon: BookOpen,
      desc: "Authored & Edited ISBN Volumes",
      color: "from-teal-500/20 to-teal-950/40 text-teal-400 border-teal-500/30",
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Pending Approval Notice if applicable */}
        {user?.accountStatus === "PENDING" && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-400" />
            <div>
              <span className="font-semibold text-white">Registration Pending Approval:</span> Your account has been created and is waiting for administrator approval. You can view existing institutional records and update your profile.
            </div>
          </div>
        )}

        {/* Hero Welcome Banner */}
        <div className="relative overflow-hidden p-6 md:p-8 rounded-2xl bg-gradient-to-r from-[var(--surface-card)] via-[var(--surface-elevated)] to-[var(--surface-deep)] border border-[var(--border-color)]">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Academic Session: {selectedSession?.name || "2026-27"}
                </span>
                <span className="text-sm text-[var(--text-muted)]">•</span>
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {user?.name || "Faculty Member"}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                Welcome to Faculty Vault
              </h1>
              <p className="text-sm md:text-base text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                Centralized ERP workspace for organizing research, patents, journal articles, books, and conference documents. Every upload is automatically mapped into your institutional Google Drive folder hierarchy and synchronized with Google Sheets reporting.
              </p>
            </div>

            {/* Quick Metrics Cards */}
            <div className="flex items-center gap-4">
              <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface-deep)] border border-[var(--border-color)] min-w-[130px] text-center">
                <span className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider">Records</span>
                <div className="text-3xl font-extrabold text-white font-mono mt-1.5">
                  {isLoading ? "..." : dashboardData.stats.totalRecords}
                </div>
              </div>
              <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface-deep)] border border-[var(--border-color)] min-w-[130px] text-center">
                <span className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider">Documents</span>
                <div className="text-3xl font-extrabold text-emerald-400 font-mono mt-1.5">
                  {isLoading ? "..." : dashboardData.stats.totalAttachments}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6 Category Modules Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight text-white uppercase text-[var(--text-muted)]">
              Academic Modules ({selectedSession?.name})
            </h2>
            <span className="text-xs sm:text-sm text-[var(--text-secondary)]">Click to explore and manage category records</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryCards.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.title}
                  href={cat.href}
                  className="group relative p-5 sm:p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] hover:border-emerald-500/40 transition-all duration-200 hover:shadow-lg flex flex-col justify-between hover:scale-[1.01]"
                >
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${cat.color} border`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {cat.title}
                      </h3>
                      <span className="text-lg font-bold font-mono text-white">
                        {isLoading ? "-" : cat.count}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">{cat.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Records & Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Recent Records List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-tight text-white uppercase text-[var(--text-muted)]">
                Recent Records in {selectedSession?.name}
              </h2>
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] divide-y divide-[var(--border-color)] overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-[var(--text-muted)]">
                  Loading recent uploads...
                </div>
              ) : dashboardData.records.length === 0 ? (
                <div className="p-8 text-center text-sm text-[var(--text-muted)] space-y-3">
                  <p>No records found in session {selectedSession?.name}.</p>
                  <Link
                    href="/conference"
                    className="inline-block px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-sm"
                  >
                    Upload First Record
                  </Link>
                </div>
              ) : (
                dashboardData.records.map((rec: any) => {
                  const title =
                    rec.conferenceDetails?.title ||
                    rec.patentDetails?.title ||
                    rec.fdpDetails?.topic ||
                    rec.researchArticleDetails?.title ||
                    rec.bookChapterDetails?.title ||
                    rec.bookDetails?.title ||
                    "Academic Record";

                  return (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between p-4 sm:p-4.5 hover:bg-[var(--surface-elevated)] transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="p-2.5 rounded-xl bg-[var(--surface-deep)] border border-[var(--border-color)] text-emerald-400 flex-shrink-0">
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate max-w-md">
                              {title}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {rec.recordCode}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {rec.category.replace("_", " ")} • {rec.attachments?.length || 0} attachments
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-[var(--text-muted)] whitespace-nowrap ml-4 font-medium">
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Architecture & Storage Status */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold tracking-tight text-white uppercase text-[var(--text-muted)]">
              Vault Architecture Status
            </h2>

            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Google Workspace Shared Drive</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    Structured folders automatically maintained by session and category.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Google Sheets Reporting Layer</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    Asynchronous Outbox pattern with automatic retry and duplicate row prevention.
                  </p>
                </div>
              </div>

              <div className="pt-3.5 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Database: PostgreSQL</span>
                <span className="text-emerald-400 font-semibold">Source of Truth</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
