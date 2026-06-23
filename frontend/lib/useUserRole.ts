"use client";

import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/auth";

type CommuneSummary = {
  id: number;
  name: string;
  postal_code: string;
};

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [communeId, setCommuneId] = useState<number | null>(null);
  const [commune, setCommune] = useState<CommuneSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.role) setRole(data.role);
        if (data?.communeId != null) setCommuneId(data.communeId);
        if (data?.commune) setCommune(data.commune);
      })
      .finally(() => setLoading(false));
  }, []);

  return {
    role,
    communeId,
    commune,
    loading,
    isAdmin: role === "admin",
    isMairie: role === "mairie",
  };
}
