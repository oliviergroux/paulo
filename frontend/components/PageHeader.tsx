type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
        <div>
          <p className="text-sm font-medium text-blue-600 mb-1">{eyebrow}</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950">
            {title}
          </h1>
          {description && (
            <p className="text-slate-500 mt-2">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        )}
      </div>
    </header>
  );
}
