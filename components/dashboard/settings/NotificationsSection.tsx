"use client";

import { useState } from "react";
import type { SettingsResponse } from "@/lib/settingsTypes";
import SettingsCard from "./SettingsCard";
import { ToggleRow } from "./SettingsRow";

export default function NotificationsSection({ notifications }: { notifications: SettingsResponse["notifications"] }) {
  const [weeklySummary, setWeeklySummary] = useState(notifications.weeklySummary);
  const [needsAttention, setNeedsAttention] = useState(notifications.needsAttention);
  const [metaAccessLost, setMetaAccessLost] = useState(notifications.metaAccessLost);
  const [error, setError] = useState<string | null>(null);

  async function save(next: { weeklySummary: boolean; needsAttention: boolean; metaAccessLost: boolean }) {
    setError(null);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Could not save your notification preferences.");
      }
    } catch {
      setError("Network error - please try again.");
    }
  }

  return (
    <SettingsCard title="Notifications">
      <ToggleRow
        label="Weekly summary email"
        description="A recap of how your account did, by email."
        checked={weeklySummary}
        onChange={(checked) => {
          setWeeklySummary(checked);
          save({ weeklySummary: checked, needsAttention, metaAccessLost });
        }}
      />
      <ToggleRow
        label='Alert when status turns "Needs attention"'
        description="Email when the AI Summary tab flags something worth a look."
        checked={needsAttention}
        onChange={(checked) => {
          setNeedsAttention(checked);
          save({ weeklySummary, needsAttention: checked, metaAccessLost });
        }}
      />
      <ToggleRow
        label="Alert when Meta access is lost"
        description="Email if we can no longer reach your connected ad account."
        checked={metaAccessLost}
        onChange={(checked) => {
          setMetaAccessLost(checked);
          save({ weeklySummary, needsAttention, metaAccessLost: checked });
        }}
      />
      <ToggleRow label="Push notifications" checked={false} disabled lockedNote="Coming soon." />

      {error && (
        <p className="text-[12px]" style={{ color: "var(--db-danger-text)" }}>
          {error}
        </p>
      )}
    </SettingsCard>
  );
}
