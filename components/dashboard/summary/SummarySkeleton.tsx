function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse-fade rounded-[var(--db-radius-card)] ${className}`} style={{ background: "var(--db-surface)" }} />;
}

export default function SummarySkeleton() {
  return (
    <div className="space-y-[var(--db-card-gap)]">
      <Block className="h-20" />
      <div className="grid grid-cols-2 gap-[var(--db-card-gap)]">
        <Block className="h-28" />
        <Block className="h-28" />
        <Block className="h-28" />
        <Block className="h-28" />
      </div>
      <Block className="h-20" />
      <Block className="h-48" />
      <Block className="h-56" />
    </div>
  );
}
