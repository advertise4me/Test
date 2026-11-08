import { ArrowDown, ArrowUp } from "lucide-react";
import type { KpiTile } from "@/lib/kpiConfig";
import { dashboardType } from "@/lib/theme/dashboard";
import { KPI_ICONS } from "./icons";

function ChangeBadge({ change }: { change: KpiTile["change"] }) {
  if (!change) return null;
  const Icon = change.direction === "up" ? ArrowUp : ArrowDown;
  const color = change.isGood ? "var(--db-success-text)" : "var(--db-danger-text)";
  return (
    <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold" style={{ color }}>
      <Icon size={12} strokeWidth={2.25} />
      {change.percent.toFixed(0)}%
    </span>
  );
}

export default function KpiGrid({ kpis }: { kpis: KpiTile[] }) {
  const seenKeys = new Set<string>();
  const uniqueKpis = kpis.filter((kpi) => (seenKeys.has(kpi.key) ? false : (seenKeys.add(kpi.key), true)));
  return (
    <div className="grid grid-cols-2 gap-[var(--db-card-gap)]">
      {uniqueKpis.map((kpi) => {
        const Icon = KPI_ICONS[kpi.icon];
        return (
          <div
            key={kpi.key}
            className="rounded-[var(--db-radius-card)] p-[var(--db-card-padding)]"
            style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
          >
            <Icon size={20} strokeWidth={1.75} color="var(--db-text-secondary)" />
            <p className="mt-2 truncate text-[13px]" style={{ color: "var(--db-text-secondary)" }}>
              {kpi.label}
            </p>
            <p className={`${dashboardType.kpiNumber} mt-0.5 truncate`} style={{ color: "var(--db-text-primary)" }}>
              {kpi.value}
            </p>
            <div className="mt-1 h-4">
              <ChangeBadge change={kpi.change} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
