"use client";

import React from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Shield,
  ArrowRight,
  Sparkles,
  HardDrive,
  FileSpreadsheet,
  Database,
  FileCheck,
  Calendar,
  Layers,
  Award,
  Presentation,
  GraduationCap,
  FileText,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export default function LandingPage() {
  const featureList = [
    {
      title: "Centralized Academic Records",
      description:
        "Replace scattered local folders and lost emails with one authoritative, ERP-level academic records system.",
      icon: Database,
    },
    {
      title: "Google Drive Automated Hierarchy",
      description:
        "Every upload automatically lands in a standardized Shared Drive structure: Institute/Faculty/Session/Category/Record.",
      icon: HardDrive,
    },
    {
      title: "Smart Session-Based Organization",
      description:
        "Global academic session filter across 2022-23 to 2029-30 seamlessly segregates achievements by calendar year.",
      icon: Calendar,
    },
    {
      title: "Secure In-App Document Preview",
      description:
        "Preview PDFs and image proofs with zoom and streaming controls without granting public URL access.",
      icon: FileCheck,
    },
    {
      title: "Six Core Engineering Modules",
      description:
        "Tailored schemas for Conferences, Patents, FDPs, Research Articles, Book Chapters, and ISBN-validated Books.",
      icon: Layers,
    },
    {
      title: "Automated Google Sheets Reporting",
      description:
        "Asynchronous outbox queue synchronizes institutional spreadsheet tabs with duplicate prevention and error retries.",
      icon: FileSpreadsheet,
    },
  ];

  const modules = [
    { name: "Conferences", icon: Presentation, meta: "National & International" },
    { name: "Patents", icon: Award, meta: "Design & Utility Patents" },
    { name: "FDPs", icon: GraduationCap, meta: "AICTE ATAL & Workshops" },
    { name: "Research Articles", icon: FileText, meta: "SCOPUS, WOS, SCI" },
    { name: "Book Chapters", icon: Bookmark, meta: "Peer-Reviewed Volumes" },
    { name: "Books", icon: BookOpen, meta: "ISBN String & Dates" },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-24 py-10 animate-in fade-in duration-300">
        {/* HERO SECTION */}
        <section className="relative text-center space-y-8 pt-8 pb-14">
          {/* Subtle Glow Backdrop */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[340px] bg-emerald-500/15 blur-[130px] pointer-events-none rounded-full" />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm font-semibold tracking-wide">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Institutional Academic Records & Document Management</span>
          </div>

          {/* Main Headline - RALEWAY (LARGE) FOR BRAND TAGLINE */}
          <h1 className="font-raleway text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.12]">
            Your Academic Journey. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 drop-shadow-sm">
              One Secure Vault.
            </span>
          </h1>

          {/* Supporting Text */}
          <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed font-normal">
            Organize your research, publications, patents, and academic achievements in one centralized workspace for engineering institutes.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm sm:text-base hover:bg-emerald-400 transition-all shadow-emerald shadow-lg hover:scale-[1.02] active:scale-[0.99]"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </Link>

            <a
              href="#features"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] text-white hover:border-emerald-500/40 text-sm sm:text-base font-semibold transition-all hover:bg-[var(--surface-card)]"
            >
              <span>Explore Features</span>
            </a>
          </div>
        </section>

        {/* 6 MODULES SHOWCASE */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <span className="text-sm font-bold uppercase tracking-wider text-emerald-400 font-mono">
              Academic Modules
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Covering All Faculty Achievements</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.name}
                  className="p-5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-color)] flex flex-col items-center text-center space-y-3 hover:border-emerald-500/40 transition-all hover:shadow-md group"
                >
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {m.name}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">{m.meta}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* THREE TIER ARCHITECTURE VISUALIZATION */}
        <section className="p-8 sm:p-10 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)] space-y-8">
          <div className="max-w-3xl">
            <span className="text-sm font-bold uppercase tracking-wider text-emerald-400 font-mono">
              Engineered Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Clear Separation of Architectural Responsibilities
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2 leading-relaxed">
              Google Drive or Google Sheets are never used as transactional databases. Faculty Vault enforces strict data architecture boundaries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-[var(--surface-deep)] border border-[var(--border-color)] space-y-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">1. PostgreSQL Database</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                <strong className="text-emerald-400 font-semibold">Source of truth.</strong> Stores profiles, sessions, category metadata (including Books ISBN string and dates), Drive folder IDs, and audit logs.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[var(--surface-deep)] border border-[var(--border-color)] space-y-3">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-block">
                <HardDrive className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">2. Google Shared Drive</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                <strong className="text-blue-400 font-semibold">Document storage.</strong> Maintains automated directory hierarchy by session and record code. Keeps documents private and permission-controlled.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[var(--surface-deep)] border border-[var(--border-color)] space-y-3">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 inline-block">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">3. Google Sheets Outbox</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                <strong className="text-purple-400 font-semibold">Reporting layer.</strong> Six dedicated tabs synchronized asynchronously via durable job queue with duplicate prevention and admin retry monitoring.
              </p>
            </div>
          </div>
        </section>

        {/* CORE FEATURES GRID */}
        <section id="features" className="space-y-8">
          <div className="text-center space-y-2">
            <span className="text-sm font-bold uppercase tracking-wider text-emerald-400 font-mono">
              Platform Features
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Everything Required for Academic Audits</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureList.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-7 rounded-xl bg-[var(--surface-card)] border border-[var(--border-color)] hover:border-emerald-500/35 transition-all space-y-3 group"
                >
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block group-hover:bg-emerald-500/20 transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="p-10 sm:p-14 rounded-2xl bg-gradient-to-b from-[var(--surface-card)] to-[var(--surface-deep)] border border-[var(--border-color)] text-center space-y-5">
          <h2 className="font-raleway text-3xl sm:text-4xl font-extrabold text-white">
            Ready to organize your academic portfolio?
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-xl mx-auto">
            Sign in with your Google account or test immediately with pre-configured development profiles.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm sm:text-base hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/25 hover:scale-[1.02]"
            >
              <span>Access Faculty Vault</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </Link>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
