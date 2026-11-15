"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface AcademicSession {
  id: string;
  name: string;
  isCurrent: boolean;
  isActive: boolean;
}

interface SessionContextType {
  sessions: AcademicSession[];
  selectedSession: AcademicSession | null;
  setSelectedSession: (session: AcademicSession) => void;
  isLoading: boolean;
  refreshSessions: () => Promise<void>;
}

const AcademicSessionContext = createContext<SessionContextType | undefined>(undefined);

export function AcademicSessionProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [selectedSession, setSelectedSessionState] = useState<AcademicSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data: AcademicSession[] = await res.json();
        setSessions(data);

        // Check if there is a saved session preference in localStorage
        const savedSessionId = localStorage.getItem("faculty_vault_session_id");
        const foundSaved = data.find((s) => s.id === savedSessionId);

        if (foundSaved) {
          setSelectedSessionState(foundSaved);
        } else {
          // Default to the current session (e.g. 2026-27) or first active
          const current = data.find((s) => s.isCurrent) || data.find((s) => s.isActive) || data[0] || null;
          setSelectedSessionState(current);
          if (current) {
            localStorage.setItem("faculty_vault_session_id", current.id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load academic sessions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const setSelectedSession = (session: AcademicSession) => {
    setSelectedSessionState(session);
    localStorage.setItem("faculty_vault_session_id", session.id);
  };

  return (
    <AcademicSessionContext.Provider
      value={{
        sessions,
        selectedSession,
        setSelectedSession,
        isLoading,
        refreshSessions: fetchSessions,
      }}
    >
      {children}
    </AcademicSessionContext.Provider>
  );
}

export function useAcademicSession() {
  const context = useContext(AcademicSessionContext);
  if (!context) {
    throw new Error("useAcademicSession must be used within an AcademicSessionProvider");
  }
  return context;
}
