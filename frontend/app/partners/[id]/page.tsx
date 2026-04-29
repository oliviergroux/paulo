"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type RequestItem = {
  id: number;
  phone: string;
  transcription: string;
  category: string;
  subtype: string;
  status: string;
  created_at: string;
  first_name?: string | null;
  last_name?: string | null;
  address?: string | null;
};

export default function PartnerDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [requests, setRequests] = useState<RequestItem[]>([]);

  const fetchRequests = async () => {
    const res = await fetch(
      `https://paulo-backend.onrender.com/partners/${id}/requests`
    );
    const data = await res.json();
    setRequests(data);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-black">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">Détail partenaire</h1>

        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white p-5 rounded-2xl shadow-sm">
              <p className="text-sm text-gray-500 mb-2">
                {new Date(req.created_at).toLocaleString()}
              </p>

              <p className="text-lg">{req.transcription}</p>

              {(req.first_name || req.last_name || req.address) && (
                <div className="mt-4 bg-gray-50 border rounded-xl p-3 text-sm">
                  <p className="font-semibold text-gray-400 uppercase mb-1">
                    Client
                  </p>

                  {(req.first_name || req.last_name) && (
                    <p>
                      <strong>Nom :</strong>{" "}
                      {[req.first_name, req.last_name]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  )}

                  {req.address && (
                    <p>
                      <strong>Adresse :</strong> {req.address}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}