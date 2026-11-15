"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useSession } from "next-auth/react";
import {
  ShieldCheck,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  RefreshCw,
  Plus,
  Search,
  AlertTriangle,
  History,
  Layers,
  FileText,
  Calendar,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminPage() {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any;

  // Active tab: 'faculty' | 'sessions' | 'sync' | 'audit'
  const [activeTab, setActiveTab] = useState<"faculty" | "sessions" | "sync" | "audit">("faculty");

  // Stats state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Faculty list state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [facultySearch, setFacultySearch] = useState("");
  const [facultyStatusFilter, setFacultyStatusFilter] = useState("ALL");
  const [isLoadingFaculty, setIsLoadingFaculty] = useState(false);

  // Sessions state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sessions, setSessions] = useState<any[]>([]);
  const [newSessionName, setNewSessionName] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Sheets sync queue state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [syncJobs, setSyncJobs] = useState<any[]>([]);
  const [syncStatusFilter, setSyncStatusFilter] = useState("ALL");
  const [isRetryingSync, setIsRetryingSync] = useState(false);

  // Audit logs state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // 1. Fetch Stats
  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // 2. Fetch Faculty
  const fetchFaculty = async () => {
    try {
      setIsLoadingFaculty(true);
      const params = new URLSearchParams();
      if (facultySearch.trim()) params.append("search", facultySearch.trim());
      if (facultyStatusFilter !== "ALL") params.append("status", facultyStatusFilter);

      const res = await fetch(`/api/admin/faculty?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFacultyList(data);
      }
    } catch (err) {
      console.error("Failed to load faculty:", err);
    } finally {
      setIsLoadingFaculty(false);
    }
  };

  // 3. Fetch Sessions
  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  };

  // 4. Fetch Sync Jobs
  const fetchSyncJobs = async () => {
    try {
      const params = new URLSearchParams();
      if (syncStatusFilter !== "ALL") params.append("status", syncStatusFilter);
      const res = await fetch(`/api/admin/sync-jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSyncJobs(data);
      }
    } catch (err) {
      console.error("Failed to load sync jobs:", err);
    }
  };

  // 5. Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      const res = await fetch("/api/admin/audit-logs");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchFaculty();
    fetchSessions();
    fetchSyncJobs();
    fetchAuditLogs();
  }, []);

  // Faculty Approval action
  const handleApproval = async (userId: string, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch("/api/admin/faculty/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      if (res.ok) {
        toast.success(`Faculty account ${status.toLowerCase()} successfully`);
        fetchFaculty();
        fetchStats();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // Add Session action
  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    try {
      setIsCreatingSession(true);
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSessionName.trim(), isActive: true }),
      });
      if (res.ok) {
        toast.success(`Academic session ${newSessionName} added`);
        setNewSessionName("");
        fetchSessions();
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create session");
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Set Current Session
  const handleSetCurrentSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCurrent: true, isActive: true }),
      });
      if (res.ok) {
        toast.success("Default current session updated");
        fetchSessions();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Retry Failed Sync Jobs
  const handleRetryFailedJobs = async (jobId?: string) => {
    try {
      setIsRetryingSync(true);
      const res = await fetch("/api/admin/sync-jobs/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobId ? { jobId } : { retryAllFailed: true }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Retried ${data.processed} Google Sheets sync jobs`);
        fetchSyncJobs();
        fetchStats();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRetryingSync(false);
    }
  };

  // Unauthorized view for non-admin
  if (user && user.role !== "ADMIN") {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto space-y-4">
          <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Lock className="w-10 h-10" />
          </div>
          <h2 className="text-lg font-bold text-white">Institutional Admin Access Required</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            This workspace is reserved for Deans, Directors, and Institute Academic Administrators. If you require administrator privileges, please contact your institutional administrator.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Admin Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)]">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-950/40 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Institutional Governance Console
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Admin Scope
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Manage faculty onboarding approvals, institutional academic sessions, Google Sheets synchronization, and audit activity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchStats();
                fetchFaculty();
                fetchSessions();
                fetchSyncJobs();
                fetchAuditLogs();
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] text-white hover:border-emerald-500/30 transition-all hover:bg-[var(--surface-card)]"
            >
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)]">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Total Faculty
            </span>
            <div className="text-3xl font-extrabold font-mono text-white mt-1.5">
              {stats?.totalFaculty || 0}
            </div>
            <div className="text-xs font-medium text-[var(--text-secondary)] mt-1">
              Registered academic profiles
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)]">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Pending Approvals
            </span>
            <div className="text-3xl font-extrabold font-mono text-amber-400 mt-1.5">
              {stats?.pendingApprovals || 0}
            </div>
            <div className="text-xs font-medium text-[var(--text-secondary)] mt-1">
              Awaiting admin review
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)]">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Total Records
            </span>
            <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-1.5">
              {stats?.totalRecords || 0}
            </div>
            <div className="text-xs font-medium text-[var(--text-secondary)] mt-1">
              Across all 6 categories
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)]">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Sheets Sync Queue
            </span>
            <div className="text-3xl font-extrabold font-mono text-white mt-1.5 flex items-center gap-2">
              <span>{stats?.totalSyncJobs || 0}</span>
              {stats?.failedSyncJobs > 0 && (
                <span className="text-xs font-semibold text-rose-400">({stats.failedSyncJobs} failed)</span>
              )}
            </div>
            <div className="text-xs font-medium text-[var(--text-secondary)] mt-1">
              Google Sheets reporting jobs
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border-color)] space-x-1">
          <button
            onClick={() => setActiveTab("faculty")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "faculty"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Faculty Management ({stats?.totalFaculty || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "sessions"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Academic Sessions ({sessions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("sync")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "sync"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Google Sheets Sync Outbox</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "audit"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* TAB 1: FACULTY MANAGEMENT & APPROVALS */}
        {activeTab === "faculty" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[var(--surface-deep)] border border-[var(--border-color)]">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search faculty by name, email, ID, department..."
                  value={facultySearch}
                  onChange={(e) => setFacultySearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchFaculty()}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2.5">
                <select
                  value={facultyStatusFilter}
                  onChange={(e) => {
                    setFacultyStatusFilter(e.target.value);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending Approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>

                <button
                  onClick={fetchFaculty}
                  className="px-4 py-2 text-sm font-bold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-sm"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--surface-deep)] text-xs font-bold uppercase text-[var(--text-muted)]">
                    <th className="py-3.5 px-4">Faculty Member</th>
                    <th className="py-3.5 px-4">ID & Department</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Records</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {facultyList.map((u) => {
                    const fp = u.facultyProfile;
                    return (
                      <tr key={u.id} className="hover:bg-[var(--surface-elevated)]/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-bold text-white">{u.name || "Unnamed"}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{u.email}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-mono text-emerald-400 font-bold">
                            {fp?.facultyId || "Not Registered"}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {fp?.department || "No department"}
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono font-medium">{u.role}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                              u.accountStatus === "APPROVED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : u.accountStatus === "PENDING"
                                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {u.accountStatus}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono font-semibold">
                          {u._count?.recordsCreated || 0}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {u.accountStatus === "PENDING" ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproval(u.id, "APPROVED")}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 text-xs font-bold transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleApproval(u.id, "REJECTED")}
                                className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white text-xs font-bold transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-[var(--text-muted)]">Verified</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ACADEMIC SESSIONS MANAGEMENT */}
        {activeTab === "sessions" && (
          <div className="space-y-6">
            {/* Add Session Form */}
            <div className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)]">
              <h3 className="text-base font-bold text-white mb-1.5">Add New Academic Session</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                Define institutional academic calendar sessions (e.g. 2030-31) to organize and partition document storage across Google Drive and PostgreSQL.
              </p>

              <form onSubmit={handleAddSession} className="flex items-center gap-3 max-w-md">
                <input
                  type="text"
                  required
                  placeholder="e.g. 2030-31"
                  pattern="^\d{4}-\d{2}$"
                  title="Session format must be YYYY-YY (e.g. 2030-31)"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={isCreatingSession}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.99]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Session</span>
                </button>
              </form>
            </div>

            {/* Sessions Table */}
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--surface-deep)] text-xs font-bold uppercase text-[var(--text-muted)]">
                    <th className="py-3.5 px-4">Session Name</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Default / Current</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-[var(--surface-elevated)]/50 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-white text-base">{s.name}</td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {s.isActive ? "Active" : "Archived"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {s.isCurrent ? (
                          <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-500 text-slate-950 shadow-sm">
                            ★ Primary Current
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)] font-medium">Archived / Past</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {!s.isCurrent && (
                          <button
                            onClick={() => handleSetCurrentSession(s.id)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[var(--surface-elevated)] border border-[var(--border-color)] text-white hover:border-emerald-500/40 transition-all hover:bg-[var(--surface-card)]"
                          >
                            Set Default
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: GOOGLE SHEETS SYNC QUEUE */}
        {activeTab === "sync" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-[var(--surface-deep)] border border-[var(--border-color)]">
              <div>
                <h3 className="text-sm font-bold text-white">Google Sheets Outbox Queue</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Durable PostgreSQL job table for institutional reporting synchronization.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleRetryFailedJobs()}
                  disabled={isRetryingSync}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetryingSync ? "animate-spin" : ""}`} />
                  <span>Retry All Failed</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--surface-deep)] text-xs font-bold uppercase text-[var(--text-muted)]">
                    <th className="py-3.5 px-4">Job ID / Record</th>
                    <th className="py-3.5 px-4">Tab & Action</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Attempts</th>
                    <th className="py-3.5 px-4">Error / Response</th>
                    <th className="py-3.5 px-4 text-right">Retry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {syncJobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-[var(--text-muted)]">
                        No sync jobs in queue.
                      </td>
                    </tr>
                  ) : (
                    syncJobs.map((j) => (
                      <tr key={j.id} className="hover:bg-[var(--surface-elevated)]/50 transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-mono text-emerald-400 font-bold text-sm">
                            {j.record?.recordCode}
                          </span>
                          <div className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                            {j.id.slice(0, 12)}...
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-white">{j.category}</span>
                          <div className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                            {j.action}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                              j.status === "SUCCEEDED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : j.status === "PROCESSING"
                                ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                                : j.status === "FAILED"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            }`}
                          >
                            {j.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono font-medium">{j.attempts} / {j.maxAttempts}</td>
                        <td className="py-4 px-4 max-w-xs truncate text-xs text-[var(--text-secondary)]">
                          {j.lastError || "Synchronized successfully"}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleRetryFailedJobs(j.id)}
                            className="p-2 text-[var(--text-secondary)] hover:text-white rounded-lg hover:bg-[var(--surface-elevated)] transition-colors"
                            title="Retry sync job"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT TRAIL */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-[var(--surface-deep)] border border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-white">Immutable Institutional Audit Log</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Cryptographically tracked system activity across faculty record creation, edits, approvals, and report sync.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--surface-deep)] text-xs font-bold uppercase text-[var(--text-muted)]">
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Entity</th>
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--surface-elevated)]/50 transition-colors">
                      <td className="py-4 px-4 text-xs text-[var(--text-muted)] whitespace-nowrap font-medium">
                        {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-emerald-400">
                        {log.action}
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-[var(--text-secondary)]">
                        {log.entityType}
                      </td>
                      <td className="py-4 px-4 text-white font-medium">
                        {log.user?.name || log.user?.email || "System"}
                      </td>
                      <td className="py-4 px-4 max-w-sm truncate text-xs text-[var(--text-secondary)] font-mono">
                        {log.details || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
