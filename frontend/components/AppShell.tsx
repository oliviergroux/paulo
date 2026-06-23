"use client";

import Link from "next/link";
import type { AdminNav } from "@/lib/types";

type AppShellProps = {
  activeNav: AdminNav;
  sidebarNote?: {
    title: string;
    description: string;
  };
  children: React.ReactNode;
  maxWidth?: "6xl" | "7xl";
};

const NAV_ITEMS: { id: AdminNav; href: string; label: string }[] = [
  { id: "dashboard", href: "/", label: "Dashboard" },
  { id: "mairie", href: "/mairie", label: "Mairie" },
  { id: "partners", href: "/partners", label: "Partenaires" },
  { id: "clients", href: "/clients", label: "Clients" },
];

async function handleLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

export default function AppShell({
  activeNav,
  sidebarNote,
  children,
  maxWidth = "7xl",
}: AppShellProps) {
  const maxWidthClass = maxWidth === "6xl" ? "max-w-6xl" : "max-w-7xl";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-950">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <div className="lg:hidden bg-slate-950 text-white px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-500 flex items-center justify-center font-bold text-sm">
              P
            </div>
            <span className="font-semibold">Paulo</span>
          </div>
          <nav className="flex gap-1 text-xs overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`whitespace-nowrap rounded-xl px-3 py-2 font-medium ${
                  activeNav === item.id
                    ? "bg-white/10"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <aside className="hidden lg:flex w-72 flex-col border-r border-white/10 bg-slate-950 text-white">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-500 flex items-center justify-center font-bold">
                P
              </div>
              <div>
                <p className="font-semibold text-lg">Paulo</p>
                <p className="text-xs text-slate-400">Local request hub</p>
              </div>
            </div>
          </div>

          <nav className="px-4 space-y-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`block rounded-2xl px-4 py-3 text-sm font-medium ${
                  activeNav === item.id
                    ? "bg-white/10"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/devenir-partenaire"
              className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/10"
            >
              Formulaire public
            </Link>
          </nav>

          <div className="mt-auto p-4 space-y-2">
            {sidebarNote && (
              <div className="rounded-3xl bg-white/10 p-4">
                <p className="text-sm font-medium">{sidebarNote.title}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {sidebarNote.description}
                </p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/10 text-left"
            >
              Déconnexion
            </button>
          </div>
        </aside>

        <section className="flex-1 bg-[#f6f8fb]">
          <div className={`${maxWidthClass} mx-auto px-5 md:px-8 py-8`}>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
