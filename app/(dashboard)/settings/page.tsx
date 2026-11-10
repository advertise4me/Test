"use client";

import { useEffect, useState } from "react";
import type { SettingsResponse } from "@/lib/settingsTypes";
import AdminSection from "@/components/dashboard/settings/AdminSection";
import ProfileSection from "@/components/dashboard/settings/ProfileSection";
import SecuritySection from "@/components/dashboard/settings/SecuritySection";
import ConnectedAccountSection from "@/components/dashboard/settings/ConnectedAccountSection";
import SpendingControlsSection from "@/components/dashboard/settings/SpendingControlsSection";
import NotificationsSection from "@/components/dashboard/settings/NotificationsSection";
import BillingSection from "@/components/dashboard/settings/BillingSection";
import LegalSection from "@/components/dashboard/settings/LegalSection";
import HelpAboutSection from "@/components/dashboard/settings/HelpAboutSection";
import { dashboardType } from "@/lib/theme/dashboard";

export default function SettingsPage() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Could not load settings.");
        return res.json();
      })
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center px-[var(--db-gutter)] py-16">
        <p style={{ color: "var(--db-danger-text)" }}>{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center px-[var(--db-gutter)] py-16">
        <p style={{ color: "var(--db-text-secondary)" }}>Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-[var(--db-card-gap)] px-[var(--db-gutter)] py-6">
      <h1 className={dashboardType.screenTitle} style={{ color: "var(--db-text-primary)" }}>
        Settings
      </h1>

      {data.isAdmin && <AdminSection />}

      <ProfileSection
        profile={data.profile}
        dashboardConfig={data.dashboardConfig}
        businessTypeOptions={data.businessTypeOptions}
      />
      <SecuritySection email={data.profile.email} />
      <ConnectedAccountSection metaConnection={data.metaConnection} />
      <SpendingControlsSection monthlySpendCap={data.spendingControls.monthlySpendCap} />
      <NotificationsSection notifications={data.notifications} />
      <BillingSection />
      <LegalSection />
      <HelpAboutSection about={data.about} />
    </main>
  );
}
