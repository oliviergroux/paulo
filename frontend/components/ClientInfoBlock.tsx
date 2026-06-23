type ClientInfoBlockProps = {
  firstName?: string | null;
  lastName?: string | null;
  address?: string | null;
};

export default function ClientInfoBlock({
  firstName,
  lastName,
  address,
}: ClientInfoBlockProps) {
  if (!firstName && !lastName && !address) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
        Fiche client
      </p>

      {(firstName || lastName) && (
        <p className="text-slate-700">
          <span className="font-semibold text-slate-950">Nom :</span>{" "}
          {[firstName, lastName].filter(Boolean).join(" ")}
        </p>
      )}

      {address && (
        <p className="text-slate-700 mt-1">
          <span className="font-semibold text-slate-950">Adresse :</span>{" "}
          {address}
        </p>
      )}
    </div>
  );
}
