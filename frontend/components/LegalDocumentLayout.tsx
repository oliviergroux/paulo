import Link from "next/link";

type LegalDocumentLayoutProps = {
  title: string;
  subtitle: string;
  sections: { title: string; paragraphs: string[] }[];
  backHref?: string;
  backLabel?: string;
};

export default function LegalDocumentLayout({
  title,
  subtitle,
  sections,
  backHref = "/devenir-partenaire",
  backLabel = "Retour au formulaire partenaire",
}: LegalDocumentLayoutProps) {
  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link
          href={backHref}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          ← {backLabel}
        </Link>

        <header className="mt-6 mb-10">
          <p className="text-sm font-semibold text-blue-600 mb-1">Paulo</p>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-slate-500 mt-3 leading-7">{subtitle}</p>
        </header>

        <article className="bg-white border border-slate-200 rounded-[32px] shadow-sm p-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 40)}
                    className="text-sm leading-7 text-slate-600 whitespace-pre-line"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}
