"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import {
  Shield,
  LogIn,
  Sparkles,
  CheckCircle2,
  HardDrive,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  UserCheck,
} from "lucide-react";

export default function LoginPage() {
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [selectedQuickRole, setSelectedQuickRole] = useState<string | null>(null);

  const handleGoogleSignIn = () => {
    setIsLoadingGoogle(true);
    signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleDevSignIn = (email: string, role = "FACULTY") => {
    setSelectedQuickRole(email);
    signIn("credentials", {
      email,
      role,
      callbackUrl: "/dashboard",
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-[var(--surface-deep)] bg-tech-grid relative overflow-hidden">
      {/* Background radial gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Logo & Heading */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-950/60 border border-emerald-500/30 text-emerald-400 shadow-emerald ring-1 ring-emerald-500/20">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Faculty Vault
            </h1>
            <p className="font-raleway text-base md:text-lg text-[var(--text-secondary)] mt-1.5 font-bold tracking-wide">
              Your Academic Journey. One Secure Vault.
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="p-8 sm:p-9 rounded-2xl bg-[var(--surface-card)]/90 backdrop-blur-xl border border-[var(--border-color)] shadow-2xl space-y-6">
          <div className="space-y-1.5 text-center">
            <h2 className="text-base font-bold text-white">Sign In to Academic Workspace</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Use your institutional Google account for identity verification.
            </p>
          </div>

          {/* Primary Action: Google OAuth */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoadingGoogle}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm sm:text-base transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {isLoadingGoogle ? (
              <span className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google Workspace</span>
          </button>

          {/* Institutional Single Sign-On Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-[var(--border-color)] w-full" />
            <span className="bg-[var(--surface-card)] px-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] absolute">
              Instant Dev / Demo Access
            </span>
          </div>

          {/* Quick-Switch Accounts for Evaluator Testing */}
          <div className="space-y-2.5">
            <span className="text-xs text-[var(--text-muted)] block text-center font-medium">
              One-click access with seeded database accounts:
            </span>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => handleDevSignIn("admin@facultyvault.edu", "ADMIN")}
                disabled={Boolean(selectedQuickRole)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] hover:border-emerald-500/40 text-left transition-all text-sm group"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="text-sm">Dean / Administrator</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 font-mono">
                      ADMIN
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                    admin@facultyvault.edu
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => handleDevSignIn("dr.sharma@facultyvault.edu", "FACULTY")}
                disabled={Boolean(selectedQuickRole)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] hover:border-emerald-500/40 text-left transition-all text-sm group"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="text-sm">Dr. Rajesh Sharma</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 font-mono">
                      F001
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                    dr.sharma@facultyvault.edu
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => handleDevSignIn("dr.mehta@facultyvault.edu", "FACULTY")}
                disabled={Boolean(selectedQuickRole)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] hover:border-amber-500/40 text-left transition-all text-sm group"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="text-sm">Dr. Vikram Mehta</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 font-mono">
                      PENDING
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                    dr.mehta@facultyvault.edu
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-amber-300 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        </div>

        {/* Security / Architecture Footer */}
        <div className="text-center text-xs text-[var(--text-muted)] space-y-1">
          <p>Protected by institutional role-based access control (RBAC).</p>
          <p>PostgreSQL Database • Private Shared Drive • Sheets Reporting Outbox</p>
        </div>
      </div>
    </div>
  );
}
