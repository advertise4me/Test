import { Sparkles } from "lucide-react";
import type { Status } from "@/lib/kpiConfig";
import { statusTokens } from "@/lib/theme/dashboard";

const STATUS_PILL_LABEL: Record<Status["level"], string> = {
  on_track: "On track",
  watch: "Keep an eye on it",
  attention: "Needs attention",
};

export default function StatusBanner({ status }: { status: Status }) {
  const tokens = statusTokens[status.level];

  return (
    <div
      className="flex items-start gap-3 rounded-[var(--db-radius-card)] p-[var(--db-card-padding)]"
      style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "linear-gradient(135deg, var(--db-accent), var(--db-accent-strong))" }}
      >
        <Sparkles size={20} strokeWidth={1.75} color="#ffffff" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-semibold" style={{ color: "var(--db-text-primary)" }}>
          {status.headline}
        </p>
        <p className="mt-0.5 text-[14px]" style={{ color: "var(--db-text-secondary)" }}>
          {status.detail}
        </p>
      </div>
      <span
        className="shrink-0 whitespace-nowrap rounded-[var(--db-radius-status)] px-3 py-1 text-[12px] font-semibold"
        style={{ background: tokens.bg, color: tokens.text }}
      >
        {STATUS_PILL_LABEL[status.level]}
      </span>
    </div>
  );
}
