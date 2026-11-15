"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AcademicSessionProvider } from "@/components/layout/session-context";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <AcademicSessionProvider>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#181b1d",
                borderColor: "#292d2c",
                color: "#f5f5f5",
              },
            }}
          />
        </AcademicSessionProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
