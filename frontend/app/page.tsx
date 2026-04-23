"use client";

import { useEffect, useState, useRef, useMemo } from "react";

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [newIds, setNewIds] = useState<number[]>([]);
  const seenIdsRef = useRef<Set<number>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
  }, []);

  const fetchRequests = async () => {
  const res = await fetch("https://paulo-backend.onrender.com/requests", {
    cache: "no-store",
  });
  const data = await res.json();

  const newlyArrived = data
    .filter((req: any) => !seenIdsRef.current.has(req.id))
    .map((req: any) => req.id);

  // ajoute tous les IDs à la mémoire
  data.forEach((req: any) => seenIdsRef.current.add(req.id));

  setNewIds(newlyArrived);
  setRequests(data);
};


 useEffect(() => {
  fetchRequests();

  const interval = setInterval(() => {
    fetchRequests();
  }, 5000); // toutes les 5 secondes

  return () => clearInterval(interval);
}, []);

useEffect(() => {
  if (newIds.length > 0) {
    if (soundEnabled) {
      audioRef.current?.play().catch((err) => {
        console.log("Audio blocked:", err);
      });
    }

    const timeout = setTimeout(() => {
      setNewIds([]);
    }, 4000);

    return () => clearTimeout(timeout);
  }
}, [newIds, soundEnabled]);

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
     <div className="flex items-center gap-4 mb-4">
  <button
    onClick={() => setSoundEnabled((prev) => !prev)}
    className={`px-3 py-2 rounded text-white ${
      soundEnabled ? "bg-green-600" : "bg-gray-500"
    }`}
  >
    {soundEnabled ? "🔔 Son activé" : "🔕 Son désactivé"}
  </button>
</div>
      <div className="flex gap-4 mb-4">
        <select
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border p-2"
        >
          <option value="all">Tous statuts</option>
          <option value="new">Nouveau</option>
          <option value="done">Traité</option>
        </select>

        <select
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border p-2"
        >
          <option value="all">Toutes catégories</option>
          <option value="transport">Transport</option>
          <option value="commerce">Commerce</option>
          <option value="service_local">Service local</option>
          <option value="mairie">Mairie</option>
        </select>
      </div>
      
      <table className="w-full border border-blue-200">
        <thead>
          <tr className="bg-blue-100 text-left">
            <th className="p-3 border border-blue-200">Date</th>
            <th className="p-3 border border-blue-200">Téléphone</th>
            <th className="p-3 border border-blue-200">Demande</th>
            <th className="p-3 border border-blue-200">Catégorie</th>
            <th className="p-3 border border-blue-200">Sous-type</th>
            <th className="p-3 border border-blue-200">Status</th>
          </tr>
        </thead>

        <tbody>
          {requests
  .filter((req) =>
    statusFilter === "all" ? true : req.status === statusFilter
  )
  .filter((req) =>
    categoryFilter === "all" ? true : req.category === categoryFilter
  )
  .map((req) => (
            <tr
  key={req.id}
  className={`hover:bg-blue-50 transition-all ${
  newIds.includes(req.id) ? "bg-yellow-100 animate-fade-in-row" : ""
}`}
>
              <td className="p-3 border border-blue-200">
                {new Date(req.created_at + "Z").toLocaleString("fr-FR", {
  timeZone: "Europe/Paris",
})}
              </td>
              <td className="p-3 border border-blue-200">{req.phone}</td>
              <td className="p-3 border border-blue-200">
                {req.transcription}
              </td>
              <td className="p-3 border border-blue-200">{req.category}</td>
              <td className="p-3 border border-blue-200">{req.subtype}</td>
              <td className="p-3 border border-blue-200">
                {req.status === "done" ? (
                  <div className="flex gap-2">
                    <span className="text-green-600 font-semibold">Traité</span>

                    <button
                      onClick={async () => {
                        await fetch(`https://paulo-backend.onrender.com/requests/${req.id}/archive`, {
                          method: "POST",
                        });
                        fetchRequests();
                      }}
                      className="bg-gray-400 text-white px-2 py-1 rounded"
                    >
                      Archiver
                    </button>
                  </div>
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