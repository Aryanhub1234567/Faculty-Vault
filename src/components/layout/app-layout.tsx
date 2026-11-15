"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function AppLayout({
  children,
  onOpenAddRecord,
}: {
  children: React.ReactNode;
  onOpenAddRecord?: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("faculty_vault_sidebar_collapsed");
    setIsSidebarCollapsed(saved === "true");

    const handleStorage = () => {
      const current = localStorage.getItem("faculty_vault_sidebar_collapsed");
      setIsSidebarCollapsed(current === "true");
    };

    window.addEventListener("storage", handleStorage);
    const interval = setInterval(handleStorage, 500);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--surface-main)] text-[var(--foreground)]">
      <Sidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div
        className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
        }`}
      >
        <Header
          onOpenMobileSidebar={() => setMobileOpen(true)}
          onOpenAddRecord={onOpenAddRecord}
        />

        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>

        {/* Minimal footer */}
        <footer className="px-8 py-4 border-t border-[var(--border-color)] text-xs text-[var(--text-muted)] flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-white">Faculty Vault</span> — Engineering Academic Records System
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Drive: Private Shared Storage</span>
            <span>•</span>
            <span>Sheets: Automated Outbox Sync</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
