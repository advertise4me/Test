"use client";

import { ChevronDown } from "lucide-react";
import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/period";
import { dashboardIconStrokeWidth } from "@/lib/theme/dashboard";

export default function PeriodSelector({ value, onChange }: { value: PeriodKey; onChange: (period: PeriodKey) => void }) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PeriodKey)}
        aria-label="Time period"
        className="appearance-none rounded-[var(--db-radius-pill)] py-2 pl-4 pr-9 text-[14px] font-medium"
        style={{ background: "var(--db-surface-2)", color: "var(--db-text-primary)", border: "var(--db-border-width) solid var(--db-border)" }}
      >
        {PERIOD_OPTIONS.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        strokeWidth={dashboardIconStrokeWidth}
        className="pointer-events-none absolute right-3"
        color="var(--db-text-secondary)"
      />
    </div>
  );
}
