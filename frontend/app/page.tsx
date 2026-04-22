async function getRequests() {
  const res = await fetch("https://paulo-backend.onrender.com/requests", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch requests");
  }

  return res.json();
}

export default async function Home() {
  const requests = await getRequests();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Paulo — Dashboard</h1>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3 border">Date</th>
              <th className="p-3 border">Téléphone</th>
              <th className="p-3 border">Demande</th>
              <th className="p-3 border">Catégorie</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req: any) => (
              <tr key={req.id}>
                <td className="p-3 border">
                  {new Date(req.created_at).toLocaleString("fr-FR")}
                </td>
                <td className="p-3 border">{req.phone}</td>
                <td className="p-3 border">{req.transcription}</td>
                <td className="p-3 border">{req.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}