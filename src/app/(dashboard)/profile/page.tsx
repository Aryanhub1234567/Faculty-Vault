"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useSession } from "next-auth/react";
import {
  User,
  Mail,
  Building,
  BadgeCheck,
  Phone,
  Shield,
  Save,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states for editable fields
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          if (data.facultyProfile) {
            setDepartment(data.facultyProfile.department || "");
            setDesignation(data.facultyProfile.designation || "");
            setPhone(data.facultyProfile.phone || "");
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department, designation, phone }),
      });

      if (res.ok) {
        toast.success("Profile updated successfully");
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const fp = profile?.facultyProfile;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="p-6 sm:p-7 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 font-bold text-2xl ring-2 ring-emerald-500/30 overflow-hidden flex-shrink-0">
                {profile?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{(profile?.name || "U")[0]}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-white">{profile?.name || "Faculty Member"}</h1>
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                      profile?.accountStatus === "APPROVED"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    }`}
                  >
                    {profile?.accountStatus || "Pending"}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                  Faculty ID: <span className="font-mono text-emerald-400 font-bold">{fp?.facultyId || "N/A"}</span> • Role: {profile?.role}
                </p>
              </div>
            </div>

            <div className="text-xs text-[var(--text-muted)] flex items-center gap-2 bg-[var(--surface-deep)] px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] font-medium">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Identity Verified via Google OAuth</span>
            </div>
          </div>
        </div>

        {/* Profile Details Form */}
        <div className="p-6 sm:p-7 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-color)]">
          <h2 className="text-base font-bold text-white mb-4">Institutional Details</h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
                  Full Name (Verified Identity)
                </label>
                <input
                  type="text"
                  disabled
                  value={profile?.name || ""}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-deep)] border border-[var(--border-color)] text-white/70 text-sm cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
                  Verified Google Email
                </label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ""}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-deep)] border border-[var(--border-color)] text-white/70 text-sm cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
                  Faculty Registration ID
                </label>
                <input
                  type="text"
                  disabled
                  value={fp?.facultyId || ""}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-deep)] border border-[var(--border-color)] text-white/70 text-sm font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
                  Affiliated Institute
                </label>
                <input
                  type="text"
                  disabled
                  value={fp?.institute?.name || "Apex Institute of Technology"}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-deep)] border border-[var(--border-color)] text-white/70 text-sm cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
                  Academic Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
                  Academic Designation
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Professor & HOD"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/10 hover:scale-[1.02] active:scale-[0.99]"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4 text-slate-950" />
                )}
                <span>Update Contact Info</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
