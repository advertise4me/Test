"use client";

import { useRouter } from "next/navigation";
import SettingsCard from "./SettingsCard";
import { SettingsRow } from "./SettingsRow";

/** Only rendered by the Settings page when SettingsResponse.isAdmin is true. */
export default function AdminSection() {
  const router = useRouter();

  return (
    <SettingsCard title="Admin">
      <SettingsRow label="Ad account assignments" onClick={() => router.push("/admin")} />
    </SettingsCard>
  );
}
