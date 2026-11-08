import { Lightbulb } from "lucide-react";
import { dashboardIconStrokeWidth, dashboardType } from "@/lib/theme/dashboard";

// Placeholder for the Ideate tab. A future brief replaces this with the
// real ideation flow - keep this component self-contained so swapping it
// out doesn't touch the route.
export default function IdeateComingSoon() {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-[var(--db-radius-card)] p-8 text-center"
      style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
    >
      <Lightbulb size={28} strokeWidth={dashboardIconStrokeWidth} color="var(--db-accent)" />
      <p className={dashboardType.cardTitle} style={{ color: "var(--db-text-primary)" }}>
        Ideate
      </p>
      <p className="text-[14px]" style={{ color: "var(--db-text-secondary)" }}>
        Coming soon — new ways to dream up ads and offers.
      </p>
    </div>
  );
}
