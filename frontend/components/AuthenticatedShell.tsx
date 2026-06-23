"use client";

import { useUserRole } from "@/lib/useUserRole";
import AppShell from "./AppShell";
import type { AdminNav } from "@/lib/types";

type AuthenticatedShellProps = {
  activeNav: AdminNav;
  sidebarNote?: {
    title: string;
    description: string;
  };
  children: React.ReactNode;
  maxWidth?: "6xl" | "7xl";
};

export default function AuthenticatedShell({
  activeNav,
  sidebarNote,
  children,
  maxWidth,
}: AuthenticatedShellProps) {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f8fb] flex items-center justify-center text-slate-500">
        Chargement...
      </main>
    );
  }

  if (!role) {
    return null;
  }

  return (
    <AppShell
      role={role}
      activeNav={activeNav}
      sidebarNote={sidebarNote}
      maxWidth={maxWidth}
    >
      {children}
    </AppShell>
  );
}

export function useRoleFetch() {
  const { role, loading } = useUserRole();

  const fetchApi = async (path: string, init?: RequestInit) => {
    if (!role) {
      throw new Error("Session non disponible");
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const base = role === "mairie" ? "/api/mairie" : "/api/admin";
    return fetch(`${base}${normalizedPath}`, { ...init, cache: "no-store" });
  };

  return { role, loading, fetchApi };
}
