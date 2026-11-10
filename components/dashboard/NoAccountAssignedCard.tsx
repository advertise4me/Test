import { Hourglass } from "lucide-react";
import { dashboardType } from "@/lib/theme/dashboard";

const SUPPORT_EMAIL = "admin@advertise4me.com";

// Shown in place of the dashboard/chat on the AI Summary and Recommendations
// tabs whenever the logged-in user has zero AdAccountAssignment rows
// (Phase C of the Business-Manager-system-user-token migration - see
// AGENTS.md). There is no client-facing "connect" action any more - only
// the admin can assign an ad account (the Phase B /admin page) - so this
// has no button, just a status explanation and a way to reach out.
export default function NoAccountAssignedCard() {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-[var(--db-radius-card)] p-8 text-center"
      style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
    >
      <Hourglass size={28} strokeWidth={1.75} color="var(--db-accent)" />
      <p className={dashboardType.cardTitle} style={{ color: "var(--db-text-primary)" }}>
        Your account is being set up
      </p>
      <p className="text-[14px]" style={{ color: "var(--db-text-secondary)" }}>
        Once your ad account is connected, you&apos;ll see your dashboard here.
      </p>
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="mt-1 text-[14px] font-semibold"
        style={{ color: "var(--db-accent)" }}
      >
        Contact support
      </a>
    </div>
  );
}
