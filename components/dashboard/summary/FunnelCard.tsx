import type { DashboardData } from "@/lib/kpiConfig";
import { dashboardType } from "@/lib/theme/dashboard";

export default function FunnelCard({ funnel }: { funnel: DashboardData["funnel"] }) {
  const largest = funnel.steps[0]?.count ?? 0;

  return (
    <div
      className="rounded-[var(--db-radius-card)] p-[var(--db-card-padding)]"
      style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
    >
      <p className={dashboardType.cardTitle} style={{ color: "var(--db-text-primary)" }}>
        {funnel.title}
      </p>
      <p className="mt-0.5 text-[13px]" style={{ color: "var(--db-text-secondary)" }}>
        {funnel.subtitle}
      </p>

      <div className="mt-4 space-y-3">
        {funnel.steps.map((step) => {
          const widthPercent = largest > 0 ? Math.max((step.count / largest) * 100, 4) : 0;
          return (
            <div key={step.label}>
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <span style={{ color: "var(--db-text-secondary)" }}>{step.label}</span>
                <span className="font-semibold" style={{ color: "var(--db-text-primary)" }}>
                  {step.displayValue}
                </span>
              </div>
              <div className="h-2 rounded-full" style={{ background: "var(--db-surface-2)" }}>
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${widthPercent}%`, background: "var(--db-accent)" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
