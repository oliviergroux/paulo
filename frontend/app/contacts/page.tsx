"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthenticatedShell, { useRoleFetch } from "@/components/AuthenticatedShell";
import EmptyState from "@/components/EmptyState";
import KpiCard from "@/components/KpiCard";
import PageHeader from "@/components/PageHeader";
import { displayClientName, formatDate } from "@/lib/format";
import type { ContactItem } from "@/lib/types";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [search, setSearch] = useState("");
  const { role, loading: roleLoading, fetchApi } = useRoleFetch();

  const fetchContacts = async () => {
    const res = await fetchApi("/contacts");
    const data = await res.json();
    setContacts(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (!roleLoading && role) fetchContacts();
  }, [role, roleLoading]);

  const filteredContacts = contacts.filter((contact) => {
    const fullName = [contact.first_name, contact.last_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const query = search.toLowerCase();

    return (
      fullName.includes(query) ||
      contact.phone?.toLowerCase().includes(query) ||
      contact.address?.toLowerCase().includes(query) ||
      contact.commune_name?.toLowerCase().includes(query)
    );
  });

  const namedCount = contacts.filter((c) => c.first_name || c.last_name).length;
  const totalRequests = contacts.reduce(
    (sum, c) => sum + Number(c.total_requests || 0),
    0
  );

  return (
    <AuthenticatedShell
      activeNav="contacts"
      sidebarNote={{
        title: "Contacts",
        description:
          "Habitants et contacts créés automatiquement depuis les appels et WhatsApp.",
      }}
    >
      <PageHeader
        eyebrow={role === "mairie" ? "Collectivité" : "Relation locale"}
        title="Contacts"
        description="Fiches créées automatiquement depuis les appels et WhatsApp, rattachées à une commune."
        actions={
          role === "admin" ? (
            <>
              <Link
                href="/"
                className="rounded-2xl bg-slate-950 text-white px-5 py-3 text-sm font-semibold hover:bg-slate-800 transition"
              >
                Dashboard
              </Link>
              <Link
                href="/partners"
                className="rounded-2xl bg-white border border-slate-200 text-slate-700 px-5 py-3 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Partenaires
              </Link>
            </>
          ) : (
            <Link
              href="/mairie"
              className="rounded-2xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold hover:bg-violet-700 transition"
            >
              Retour mairie
            </Link>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <KpiCard label="Contacts" value={contacts.length} variant="blue" />
        <KpiCard
          label="Profils identifiés"
          value={namedCount}
          variant="blue"
          valueClassName="text-blue-600"
        />
        <KpiCard
          label="Demandes liées"
          value={totalRequests}
          variant="emerald"
          valueClassName="text-emerald-600"
        />
      </div>

      <div className="mb-8 rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, téléphone, adresse ou commune..."
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-4">
        {filteredContacts.map((contact) => (
          <article
            key={contact.id}
            className="bg-white border border-slate-200 rounded-[28px] shadow-sm hover:border-blue-200 hover:shadow-md transition"
          >
            <div className="p-5 md:p-6 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <h2 className="text-xl font-bold">
                    {displayClientName(contact.first_name, contact.last_name)}
                  </h2>
                  <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                    {contact.phone}
                  </span>
                  {contact.commune_name && (
                    <span className="text-xs font-semibold bg-violet-100 text-violet-700 px-3 py-1 rounded-full">
                      {contact.commune_name}
                    </span>
                  )}
                  {contact.address && (
                    <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                      Adresse connue
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
                      Téléphone
                    </p>
                    <p className="font-semibold mt-2">{contact.phone}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
                      Dernière demande
                    </p>
                    <p className="font-semibold mt-2">
                      {formatDate(contact.last_request_at)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 md:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
                      Adresse
                    </p>
                    <p className="font-semibold mt-2">
                      {contact.address || "Non renseignée"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4 flex flex-col justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
                    Activité
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    {Number(contact.total_requests || 0)}
                  </p>
                  <p className="text-sm text-slate-500">
                    demande
                    {Number(contact.total_requests || 0) > 1 ? "s" : ""}
                  </p>
                </div>
                <Link
                  href={`/contacts/${contact.id}`}
                  className="w-full text-center rounded-2xl bg-slate-950 text-white px-4 py-3 text-sm font-semibold hover:bg-slate-800 transition"
                >
                  Voir la fiche
                </Link>
              </div>
            </div>
          </article>
        ))}

        {filteredContacts.length === 0 && (
          <EmptyState message="Aucun contact trouvé." />
        )}
      </div>
    </AuthenticatedShell>
  );
}
