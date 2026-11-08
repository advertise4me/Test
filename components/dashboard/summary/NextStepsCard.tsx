import { CheckCircle2, Zap } from "lucide-react";
import type { NextStep } from "@/lib/aiCopy";
import { dashboardType } from "@/lib/theme/dashboard";

export default function NextStepsCard({ nextSteps, onSelect }: { nextSteps: NextStep[]; onSelect: (step: NextStep) => void }) {
  return (
    <div
      className="rounded-[var(--db-radius-card)] p-[var(--db-card-padding)]"
      style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
    >
      <div className="flex items-center gap-2">
        <Zap size={18} strokeWidth={1.75} color="var(--db-accent)" />
        <p className={dashboardType.cardTitle} style={{ color: "var(--db-text-primary)" }}>
          What to do next
        </p>
      </div>
      <p className="mt-0.5 text-[13px]" style={{ color: "var(--db-text-secondary)" }}>
        Tap any of these to ask about it in Recommendations
      </p>

      <div className="mt-3">
        {nextSteps.map((step, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(step)}
            className="flex w-full items-center gap-3 py-3 text-left"
            style={i > 0 ? { borderTop: "var(--db-border-width) solid var(--db-border)" } : undefined}
          >
            <CheckCircle2 size={18} strokeWidth={1.75} className="shrink-0" color="var(--db-accent)" />
            <span className="text-[14px]" style={{ color: "var(--db-text-primary)" }}>
              {step.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
