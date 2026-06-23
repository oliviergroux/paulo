"use client";

import { useEffect, useState } from "react";
import type { CommuneItem } from "@/lib/types";
import { adminFetch } from "@/lib/api";

type CommuneFilterProps = {
  value: number | null;
  onChange: (communeId: number | null) => void;
  className?: string;
};

export default function CommuneFilter({
  value,
  onChange,
  className = "",
}: CommuneFilterProps) {
  const [communes, setCommunes] = useState<CommuneItem[]>([]);

  useEffect(() => {
    adminFetch("/communes")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setCommunes(data);
      })
      .catch(() => {});
  }, []);

  if (communes.length <= 1) return null;

  return (
    <select
      value={value ?? "all"}
      onChange={(event) => {
        const next = event.target.value;
        onChange(next === "all" ? null : Number(next));
      }}
      className={`rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm ${className}`}
    >
      <option value="all">Toutes les communes</option>
      {communes.map((commune) => (
        <option key={commune.id} value={commune.id}>
          {commune.name} ({commune.postal_code})
        </option>
      ))}
    </select>
  );
}
