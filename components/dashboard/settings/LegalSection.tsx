"use client";

import { useRouter } from "next/navigation";
import SettingsCard from "./SettingsCard";
import { SettingsRow } from "./SettingsRow";

// Phase 5b: each row opens the corresponding legal page (app/legal/*),
// which renders the versioned markdown content from content/legal/*.md.
export default function LegalSection() {
  const router = useRouter();

  return (
    <SettingsCard title="Legal">
      <SettingsRow label="Terms of Service" onClick={() => router.push("/legal/terms")} />
      <SettingsRow label="Ad Spend & Media Buying Disclaimer" onClick={() => router.push("/legal/disclaimer")} />
      <SettingsRow label="Privacy Policy" onClick={() => router.push("/legal/privacy")} />
      <SettingsRow label="Open Source Licenses" onClick={() => router.push("/legal/licenses")} />
    </SettingsCard>
  );
}
