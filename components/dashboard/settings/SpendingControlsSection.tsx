"use client";

import { useState } from "react";
import SettingsCard from "./SettingsCard";
import { Field, inputClassName, inputStyle } from "./Field";
import { ToggleRow } from "./SettingsRow";

export default function SpendingControlsSection({ monthlySpendCap }: { monthlySpendCap: number | null }) {
  const [value, setValue] = useState(monthlySpendCap !== null ? String(monthlySpendCap) : "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/spend-cap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlySpendCap: value === "" ? null : value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save your spend cap.");
        return;
      }
      setMessage("Saved.");
    } catch {
      setError("Network error - please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard title="Spending controls">
      <Field label="Monthly spend cap (optional)">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          inputMode="decimal"
          className={inputClassName}
          style={inputStyle}
          placeholder="e.g. 2000"
        />
      </Field>
      <p className="text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
        Stored for reference only right now - nothing automatically stops spending at this amount yet.
      </p>
      {saving && (
        <p className="text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
          Saving…
        </p>
      )}
      {message && (
        <p className="text-[12px]" style={{ color: "var(--db-success-text)" }}>
          {message}
        </p>
      )}
      {error && (
        <p className="text-[12px]" style={{ color: "var(--db-danger-text)" }}>
          {error}
        </p>
      )}

      <ToggleRow
        label="Always ask me before any change that spends money"
        checked={true}
        disabled
        lockedNote="This is mandatory for every spend-affecting action right now and can't be turned off yet."
      />
    </SettingsCard>
  );
}
