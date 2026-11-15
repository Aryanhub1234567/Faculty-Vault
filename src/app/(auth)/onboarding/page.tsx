"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Building,
  User,
  Mail,
  GraduationCap,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export default function OnboardingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [institutes, setInstitutes] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [instituteId, setInstituteId] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
      if (session.user.name) setName(session.user.name);
    }

    async function loadInstitutes() {
      try {
        const res = await fetch("/api/institutes");
        if (res.ok) {
          const data = await res.json();
          setInstitutes(data);
          if (data.length > 0) setInstituteId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load institutes:", err);
      }
    }

    loadInstitutes();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          facultyId: facultyId.trim().toUpperCase(),
          instituteId,
          department,
          designation,
          phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit onboarding profile");
      }

      toast.success("Faculty profile created! Redirecting to dashboard...");
      await update();
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Onboarding error:", err);
      setErrorMsg(err.message || "Failed to complete onboarding");
      toast.error(err.message || "Failed to complete onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-[var(--surface-deep)] bg-tech-grid relative overflow-hidden">
      <div className="w-full max-w-xl space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-950/60 border border-emerald-500/30 text-emerald-400">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Complete Faculty Onboarding
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Setup your verified academic identity and institutional profile.
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-[var(--surface-card)]/90 backdrop-blur-xl border border-[var(--border-color)] shadow-2xl">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Full Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Faculty Email (Verified Google Account)
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3.5 py-2 rounded-lg bg-[var(--surface-deep)] border border-[var(--border-color)] text-xs text-white/60 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Faculty ID / Employee Code <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                  placeholder="e.g. F001 or CS-2024"
                  className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Engineering Institute <span className="text-emerald-400">*</span>
                </label>
                <select
                  required
                  value={instituteId}
                  onChange={(e) => setInstituteId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {institutes.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Department <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Designation <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Associate Professor"
                  className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/10 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Complete Onboarding</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
