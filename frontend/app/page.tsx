"use client";

import { useEffect, useState } from "react";

type Request = {
  id: number;
  phone: string;
  transcription: string;
  category: string;
  created_at: string;
  status: string;
};

export default function Home() {
  const [requests, setRequests] = useState<Request[]>([]);

  const fetchRequests = async () => {
    const res = await fetch("https://paulo-backend.onrender.com/requests");
    const data = await res.json();
    setRequests(data);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const markAsDone = async (id: number) => {
    await fetch(`https://paulo-backend.onrender.com/requests/${id}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify("done"),
    });

    fetchRequests(); // refresh
  };

  return (
    <main className="p-8 bg-white min-h-screen text-black">
      <h1 className="text-2xl font-bold mb-6">Paulo — Dashboard</h1>

      <table className="w-full border border-blue-200">
        <thead>
          <tr className="bg-blue-100 text-left">
            <th className="p-3 border border-blue-200">Date</th>
            <th className="p-3 border border-blue-200">Téléphone</th>
            <th className="p-3 border border-blue-200">Demande</th>
            <th className="p-3 border border-blue-200">Catégorie</th>
            <th className="p-3 border border-blue-200">Status</th>
          </tr>
        </thead>

        <tbody>
          {requests.map((req) => (
            <tr key={req.id} className="hover:bg-blue-50">
              <td className="p-3 border border-blue-200">
                {new Date(req.created_at).toLocaleString()}
              </td>
              <td className="p-3 border border-blue-200">{req.phone}</td>
              <td className="p-3 border border-blue-200">
                {req.transcription}
              </td>
              <td className="p-3 border border-blue-200">{req.category}</td>

              <td className="p-3 border border-blue-200">
                {req.status === "done" ? (
                  <span className="text-green-600 font-semibold">
                    Traité
                  </span>
                ) : (
                  <button
                    onClick={() => markAsDone(req.id)}
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    Marquer traité
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}