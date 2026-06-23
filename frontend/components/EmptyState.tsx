type EmptyStateProps = {
  message: string;
};

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 shadow-sm">
      {message}
    </div>
  );
}
