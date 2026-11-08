import { Sparkles } from "lucide-react";

export default function WhatThisMeansCard({ text }: { text: string }) {
  return (
    <div
      className="flex items-start gap-3 rounded-[var(--db-radius-card)] p-[var(--db-card-padding)]"
      style={{ background: "var(--db-accent-soft)" }}
    >
      <Sparkles size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" color="var(--db-accent-ink)" />
      <div>
        <p className="text-[13px] font-semibold" style={{ color: "var(--db-accent-ink)" }}>
          What this means
        </p>
        <p className="mt-1 text-[15px] leading-snug" style={{ color: "var(--db-accent-ink)" }}>
          {text}
        </p>
      </div>
    </div>
  );
}
