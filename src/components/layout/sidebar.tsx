"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut, signIn } from "next-auth/react";
import {
  Shield,
  LayoutDashboard,
  Presentation,
  Award,
  GraduationCap,
  FileText,
  Bookmark,
  BookOpen,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  LogIn,
  LogOut,
  User,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const primaryNavItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Conference", href: "/conference", icon: Presentation },
  { name: "Patent", href: "/patents", icon: Award },
  { name: "FDP", href: "/fdp", icon: GraduationCap },
  { name: "Research Articles", href: "/research-articles", icon: FileText },
  { name: "Book Chapters", href: "/book-chapters", icon: Bookmark },
  { name: "Books", href: "/books", icon: BookOpen },
];

export function Sidebar({
  mobileOpen,
  setMobileOpen,
}: {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();

  // Persistent collapse preference
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("faculty_vault_sidebar_collapsed");
    if (saved === "true") {
      setIsCollapsed(true);
    }
    setMounted(true);
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("faculty_vault_sidebar_collapsed", next ? "true" : "false");
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any;
  const isAdmin = user?.role === "ADMIN";

  const allNavItems = [
    ...primaryNavItems,
    ...(isAdmin ? [{ name: "Admin Console", href: "/admin", icon: ShieldCheck }] : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen?.(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col justify-between border-r transition-all duration-300 ease-in-out
          bg-[var(--surface-deep)] border-[var(--border-color)]
          ${isCollapsed ? "md:w-20" : "md:w-64"}
          ${mobileOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* TOP SECTION: Branding & Collapse Toggle */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--border-color)]">
            <Link
              href="/"
              className="flex items-center gap-3 overflow-hidden group focus:outline-none"
              onClick={() => setMobileOpen?.(false)}
            >
              {/* Vault Logo Mark */}
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-950/60 border border-emerald-500/30 text-emerald-400 group-hover:border-emerald-400 transition-all shadow-sm">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--surface-deep)]" />
              </div>

              {/* Brand Name & Tagline */}
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold tracking-tight text-white">Faculty Vault</span>
                    <span className="px-1.5 py-0.5 text-[9px] font-medium tracking-wide uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      v2.0
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)] truncate">
                    Academic ERP
                  </span>
                </div>
              )}
            </Link>

            {/* Collapse/Expand Toggle Button (Desktop) */}
            <button
              onClick={toggleCollapse}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--surface-elevated)] border border-transparent hover:border-[var(--border-color)] transition-all"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-emerald-400" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Tagline Banner (Expanded only) */}
          {!isCollapsed && (
            <div className="px-4 py-2 bg-[var(--surface-main)]/60 border-b border-[var(--border-color)] text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <span className="truncate">Every Achievement. One Secure Vault.</span>
            </div>
          )}

          {/* PRIMARY NAVIGATION */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen?.(false)}
                  title={isCollapsed ? item.name : undefined}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150
                    ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--surface-elevated)]"
                    }
                    ${isCollapsed ? "justify-center px-0" : ""}
                  `}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      isActive ? "text-emerald-400" : "text-[var(--text-muted)] group-hover:text-white"
                    }`}
                  />

                  {!isCollapsed && (
                    <span className="truncate flex-1">{item.name}</span>
                  )}

                  {!isCollapsed && isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                  )}

                  {/* Tooltip for collapsed mode */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-[var(--surface-elevated)] text-white text-xs rounded-md shadow-lg border border-[var(--border-color)] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM ANCHORED SECTION: Theme toggle & Account Actions */}
        <div className="p-3 border-t border-[var(--border-color)] bg-[var(--surface-main)]/90 space-y-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle night mode"
            title={isCollapsed ? `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode` : undefined}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-white hover:bg-[var(--surface-elevated)] border border-[var(--border-color)] transition-all
              ${isCollapsed ? "justify-center px-0" : ""}
            `}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400 flex-shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            )}
            {!isCollapsed && (
              <span className="truncate">
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </span>
            )}
          </button>

          {/* Account Actions */}
          {session?.user ? (
            <div className="space-y-1">
              {/* User Identity Pill */}
              <Link
                href="/profile"
                onClick={() => setMobileOpen?.(false)}
                className={`group flex items-center gap-2.5 p-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-color)] hover:border-emerald-500/30 transition-all
                  ${isCollapsed ? "justify-center p-2" : ""}
                `}
                title={isCollapsed ? `${user.name || user.email} (${user.role})` : undefined}
              >
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs ring-1 ring-emerald-500/30 overflow-hidden flex-shrink-0">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{(user.name || user.email || "U")[0].toUpperCase()}</span>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-semibold text-white truncate">
                      {user.name || user.email}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {user.facultyId || user.role}
                      </span>
                      {user.accountStatus === "PENDING" && (
                        <span className="px-1 py-0.2 text-[9px] rounded bg-amber-500/20 text-amber-300">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Link>

              {/* Sign Out Action */}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                title={isCollapsed ? "Sign Out" : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all
                  ${isCollapsed ? "justify-center px-0" : ""}
                `}
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && <span>Sign Out</span>}
              </button>
            </div>
          ) : (
            /* Unauthenticated Visitor: Prominent Sign In button at the bottom of the sidebar */
            <div className="pt-1">
              <Link
                href="/login"
                onClick={() => setMobileOpen?.(false)}
                title={isCollapsed ? "Sign In" : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/10
                  ${isCollapsed ? "justify-center px-0" : ""}
                `}
              >
                <LogIn className="w-4 h-4 flex-shrink-0 text-slate-950" />
                {!isCollapsed && <span>Sign In with Google</span>}
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
