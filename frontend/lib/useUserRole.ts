"use client";

import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/auth";

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.role) setRole(data.role);
      })
      .finally(() => setLoading(false));
  }, []);

  return { role, loading, isAdmin: role === "admin", isMairie: role === "mairie" };
}
