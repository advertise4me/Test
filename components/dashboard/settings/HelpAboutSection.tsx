import type { SettingsResponse } from "@/lib/settingsTypes";
import SettingsCard from "./SettingsCard";
import { SettingsRow } from "./SettingsRow";

export default function HelpAboutSection({ about }: { about: SettingsResponse["about"] }) {
  return (
    <SettingsCard title="Help & about">
      <SettingsRow label="Contact support" onClick={() => (window.location.href = `mailto:${about.supportEmail}`)} />
      <div className="flex items-center justify-between px-3 py-1">
        <span className="text-[13px]" style={{ color: "var(--db-text-secondary)" }}>
          App version
        </span>
        <span className="text-[13px]" style={{ color: "var(--db-text-secondary)" }}>
          {about.appVersion}
        </span>
      </div>
      <p className="pt-2 text-center text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
        Made by Advertise4Me
      </p>
    </SettingsCard>
  );
}
