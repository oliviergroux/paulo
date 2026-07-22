"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type LifecycleCopilotShellProps = {
  activeNav?: "projects";
  children: ReactNode;
};

const NAV = [{ id: "projects" as const, href: "/lifecycle-copilot", label: "Projets" }];

async function handleLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

export default function LifecycleCopilotShell({
  activeNav = "projects",
  children,
}: LifecycleCopilotShellProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-950">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="hidden lg:flex w-72 flex-col border-r border-white/10 bg-slate-950 text-white">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-teal-500 flex items-center justify-center font-bold">
                LC
              </div>
              <div>
                <p className="font-semibold text-lg">Lifecycle Copilot</p>
                <p className="text-xs text-slate-400">Consultant CRM IA</p>
              </div>
            </div>
          </div>

          <nav className="px-4 space-y-2">
            {NAV.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`block rounded-2xl px-4 py-3 text-sm font-medium ${
                  activeNav === item.id
                    ? "bg-teal-500/20 text-teal-100"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto p-4 space-y-2">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
              <p className="text-sm font-medium text-slate-200">MVP en construction</p>
              <p className="text-xs text-slate-400 mt-1">
                Import dictionnaire et datasets CSV/XLSX à venir.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/10 text-left"
            >
              Déconnexion
            </button>
          </div>
        </aside>

        <section className="flex-1 bg-[#eef4f4]">
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
