"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { defaultPathForRole, type UserRole } from "@/lib/auth";

type ActiveCommune = {
  id: number;
  name: string;
  postal_code: string;
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");

  const [password, setPassword] = useState("");
  const [communeId, setCommuneId] = useState<number | null>(null);
  const [communes, setCommunes] = useState<ActiveCommune[]>([]);
  const [needsCommune, setNeedsCommune] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/public/communes", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setCommunes(data);
          if (data.length === 1) setCommuneId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNeedsCommune(false);

    const payload: { password: string; commune_id?: number } = { password };
    if (communeId != null) payload.commune_id = communeId;

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (data.error === "select_commune" && Array.isArray(data.communes)) {
        setCommunes(data.communes);
        setNeedsCommune(true);
        setError("Sélectionnez votre commune pour accéder à l'espace mairie.");
      } else if (data.error === "no_active_commune") {
        setError("Aucune commune active n'est configurée.");
      } else {
        setError("Mot de passe incorrect.");
      }
      setLoading(false);
      return;
    }

    const role = data.role as UserRole;
    const destination =
      nextPath && !nextPath.startsWith("/login")
        ? role === "mairie" && (nextPath === "/" || nextPath.startsWith("/partners"))
          ? "/mairie"
          : nextPath
        : defaultPathForRole(role);

    router.push(destination);
    router.refresh();
  };

  const showCommuneSelect = needsCommune || communes.length > 1;

  return (
    <main className="min-h-screen bg-[#f6f8fb] flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-[32px] shadow-sm p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-blue-500 flex items-center justify-center font-bold text-white text-lg">
            P
          </div>
          <div>
            <p className="font-semibold text-xl text-slate-950">Paulo</p>
            <p className="text-sm text-slate-500">Connexion admin ou mairie</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {showCommuneSelect && (
            <div>
              <label
                htmlFor="commune"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Commune
              </label>
              <select
                id="commune"
                value={communeId ?? ""}
                onChange={(event) =>
                  setCommuneId(
                    event.target.value ? Number(event.target.value) : null
                  )
                }
                required={needsCommune || communes.length > 1}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              >
                <option value="">Choisir une commune</option>
                {communes.map((commune) => (
                  <option key={commune.id} value={commune.id}>
                    {commune.name} ({commune.postal_code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Mot de passe admin ou mairie"
              required
            />
          </div>

          <p className="text-xs text-slate-400 leading-5">
            Le mot de passe utilisé détermine automatiquement votre espace
            (administration ou mairie).
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-950 text-white px-4 py-3 text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f8fb]" />}>
      <LoginForm />
    </Suspense>
  );
}
