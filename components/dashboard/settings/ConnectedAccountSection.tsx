import type { SettingsResponse } from "@/lib/settingsTypes";
import SettingsCard from "./SettingsCard";

const SUPPORT_EMAIL = "admin@advertise4me.com";

// Read-only since Phase C (see AGENTS.md): which ad account a client sees
// is assigned by the admin (AdAccountAssignment, Phase A), not chosen or
// changed by the client, so there's no Reconnect/Switch/Disconnect here any
// more - those are now admin-only actions on the /admin page (Phase B,
// linked from AdminSection above this on the Settings page for admins).
export default function ConnectedAccountSection({
  adAccountAssignment,
}: {
  adAccountAssignment: SettingsResponse["adAccountAssignment"];
}) {
  if (!adAccountAssignment.assigned) {
    return (
      <SettingsCard title="Connected accounts">
        <p className="text-[14px]" style={{ color: "var(--db-text-secondary)" }}>
          No ad account assigned yet. Your account is being set up.
        </p>
        <p className="text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
          Contact{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "var(--db-accent)" }}>
            {SUPPORT_EMAIL}
          </a>{" "}
          with any questions.
        </p>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard title="Connected accounts">
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: "var(--db-success-text)" }}
          aria-label="Assigned"
        />
        <div className="min-w-0">
          <p className="text-[15px] font-medium" style={{ color: "var(--db-text-primary)" }}>
            {adAccountAssignment.adAccountName ?? adAccountAssignment.adAccountId}
          </p>
          <p className="text-[13px]" style={{ color: "var(--db-text-secondary)" }}>
            {adAccountAssignment.adAccountId}
          </p>
        </div>
      </div>

      <p className="text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
        Your ad account is managed by Advertise4Me - contact{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "var(--db-accent)" }}>
          {SUPPORT_EMAIL}
        </a>{" "}
        if this needs to change.
      </p>
    </SettingsCard>
  );
}
