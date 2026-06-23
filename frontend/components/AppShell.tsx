"use client";

import Link from "next/link";
import type { AdminNav, UserRole } from "@/lib/types";

type AppShellProps = {
  role: UserRole;
  activeNav: AdminNav;
  sidebarNote?: {
    title: string;
    description: string;
  };
  children: React.ReactNode;
  maxWidth?: "6xl" | "7xl" | "full";
};

const ADMIN_NAV: { id: AdminNav; href: string; label: string }[] = [
  { id: "dashboard", href: "/", label: "Dashboard" },
  { id: "mairie", href: "/mairie", label: "Mairie" },
  { id: "partners", href: "/partners", label: "Partenaires" },
  { id: "clients", href: "/clients", label: "Clients" },
];

const MAIRIE_NAV: { id: AdminNav; href: string; label: string }[] = [
  { id: "mairie", href: "/mairie", label: "Demandes actives" },
  { id: "mairie_archives", href: "/mairie/archives", label: "Archives" },
  { id: "clients", href: "/clients", label: "Habitants" },
];

async function handleLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

export default function AppShell({
  role,
  activeNav,
  sidebarNote,
  children,
  maxWidth = "7xl",
}: AppShellProps) {
  const isMairie = role === "mairie";
  const navItems = isMairie ? MAIRIE_NAV : ADMIN_NAV;
  const maxWidthClass =
    maxWidth === "full"
      ? "max-w-[1800px]"
      : maxWidth === "6xl"
      ? "max-w-6xl"
      : "max-w-7xl";
  const logoClass = isMairie ? "bg-violet-600" : "bg-blue-500";
  const roleLabel = isMairie ? "Espace mairie" : "Administration";

  return (
    <main
      className={`min-h-screen text-slate-950 ${
        isMairie ? "bg-violet-950" : "bg-slate-950"
      }`}
    >
      <div className="flex min-h-screen flex-col lg:flex-row">
        <div
          className={`lg:hidden text-white px-4 py-3 flex items-center justify-between gap-3 ${
            isMairie ? "bg-violet-950" : "bg-slate-950"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-sm ${logoClass}`}
            >
              P
            </div>
            <div>
              <span className="font-semibold block leading-tight">Paulo</span>
              <span className="text-[10px] text-slate-400">{roleLabel}</span>
            </div>
          </div>
          <nav className="flex gap-1 text-xs overflow-x-auto">
            {navItems.map((item) => (
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

        <aside
          className={`hidden lg:flex w-72 flex-col border-r border-white/10 text-white ${
            isMairie ? "bg-violet-950" : "bg-slate-950"
          }`}
        >
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold ${logoClass}`}
              >
                P
              </div>
              <div>
                <p className="font-semibold text-lg">Paulo</p>
                <p className="text-xs text-slate-400">{roleLabel}</p>
              </div>
            </div>
            {isMairie && (
              <div className="mt-4 rounded-2xl bg-violet-900/50 border border-violet-800 px-3 py-2">
                <p className="text-xs text-violet-200">
                  Vue collectivité — accès limité
                </p>
              </div>
            )}
          </div>

          <nav className="px-4 space-y-2">
            {navItems.map((item) => (
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

            {!isMairie && (
              <Link
                href="/devenir-partenaire"
                className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/10"
              >
                Formulaire public
              </Link>
            )}
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
