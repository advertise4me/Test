"use client";

import { useState } from "react";
import { initialsFromEmail } from "@/lib/initials";
import { dashboardType } from "@/lib/theme/dashboard";
import type { SettingsResponse } from "@/lib/settingsTypes";
import SettingsCard from "./SettingsCard";
import { Field, inputClassName, inputStyle } from "./Field";

export default function ProfileSection({
  profile,
  dashboardConfig,
  businessTypeOptions,
}: {
  profile: SettingsResponse["profile"];
  dashboardConfig: SettingsResponse["dashboardConfig"];
  businessTypeOptions: SettingsResponse["businessTypeOptions"];
}) {
  const [fullName, setFullName] = useState(profile.fullName ?? "");
  const [businessName, setBusinessName] = useState(profile.businessName ?? "");
  const [businessWebsite, setBusinessWebsite] = useState(profile.businessWebsite ?? "");
  const [language, setLanguage] = useState(profile.language);
  const [businessType, setBusinessType] = useState(dashboardConfig?.businessType ?? "");
  const [targetValue, setTargetValue] = useState(
    dashboardConfig?.targetValue !== null && dashboardConfig?.targetValue !== undefined
      ? String(dashboardConfig.targetValue)
      : "",
  );
  const [primaryKpiLabel, setPrimaryKpiLabel] = useState(dashboardConfig?.primaryKpiLabel ?? null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBusinessType, setSavingBusinessType] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile() {
    setSavingProfile(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, businessName, businessWebsite, language }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save your profile.");
        return;
      }
      setMessage("Profile saved.");
    } catch {
      setError("Network error - please try again.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveBusinessType(nextType: string, nextTargetValue: string) {
    setSavingBusinessType(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/business-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: nextType, targetValue: nextTargetValue === "" ? null : nextTargetValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save your business type.");
        return;
      }
      setPrimaryKpiLabel(data.primaryKpiLabel ?? null);
      setMessage("Business type saved - this now drives what the AI Summary tab tracks.");
    } catch {
      setError("Network error - please try again.");
    } finally {
      setSavingBusinessType(false);
    }
  }

  return (
    <SettingsCard title="Profile">
      <div className="flex items-center gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[18px] font-semibold"
          style={{ background: "var(--db-surface-2)", color: "var(--db-text-primary)", border: "var(--db-border-width) solid var(--db-border)" }}
        >
          {initialsFromEmail(profile.email)}
        </div>
        <div className="min-w-0">
          <p className={dashboardType.body} style={{ color: "var(--db-text-primary)" }}>
            {fullName || profile.email}
          </p>
          <p className="truncate text-[13px]" style={{ color: "var(--db-text-secondary)" }}>
            {profile.email}
          </p>
        </div>
      </div>

      <Field label="Full name">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputClassName}
          style={inputStyle}
          placeholder="Your name"
        />
      </Field>

      <Field label="Business name">
        <input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className={inputClassName}
          style={inputStyle}
          placeholder="Your business name"
        />
      </Field>

      <Field label="Business website">
        <input
          value={businessWebsite}
          onChange={(e) => setBusinessWebsite(e.target.value)}
          className={inputClassName}
          style={inputStyle}
          placeholder="https://example.com"
          type="url"
        />
      </Field>

      <Field label="Language">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className={inputClassName}
          style={inputStyle}
        >
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </Field>

      <button
        type="button"
        onClick={saveProfile}
        disabled={savingProfile}
        className="rounded-[var(--db-radius-pill)] px-4 py-2 text-[14px] font-medium text-white disabled:opacity-50"
        style={{ background: "var(--db-accent)" }}
      >
        {savingProfile ? "Saving…" : "Save profile"}
      </button>

      <div className="pt-2" style={{ borderTop: "var(--db-border-width) solid var(--db-border)" }}>
        <Field label="Business type">
          <select
            value={businessType}
            onChange={(e) => {
              setBusinessType(e.target.value);
              saveBusinessType(e.target.value, targetValue);
            }}
            className={inputClassName}
            style={inputStyle}
          >
            {!businessType && <option value="">Not yet detected</option>}
            {businessTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
        <p className="mt-1 text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
          Auto-detected from your connected ad account - override it here if it&apos;s wrong. This is what the AI
          Summary tab uses to decide which KPIs and funnel to show you.
        </p>

        <div className="mt-3">
          <Field label={primaryKpiLabel ? `Target: ${primaryKpiLabel}` : "Target value"}>
            <input
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              onBlur={() => businessType && saveBusinessType(businessType, targetValue)}
              className={inputClassName}
              style={inputStyle}
              inputMode="decimal"
              placeholder="e.g. 4 for a 4x ROAS goal"
            />
          </Field>
        </div>
        {savingBusinessType && (
          <p className="mt-1 text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
            Saving…
          </p>
        )}
      </div>

      {message && (
        <p className="text-[13px]" style={{ color: "var(--db-success-text)" }}>
          {message}
        </p>
      )}
      {error && (
        <p className="text-[13px]" style={{ color: "var(--db-danger-text)" }}>
          {error}
        </p>
      )}
    </SettingsCard>
  );
}
