"use client";

import { useState } from "react";
import Link from "next/link";

// Required clickwrap gate (Phase 5b): shown before first Meta connect, and
// again by app/accept-terms whenever the stored terms version a user last
// accepted doesn't match the current one. The checkbox is unchecked by
// default; clicking "Agree & continue" is the explicit acceptance action
// that records a row in terms_acceptances (app/api/legal/accept/route.ts).
export default function TermsClickwrap({ onAccepted }: { onAccepted: () => void }) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/legal/accept", { method: "POST" });
      if (!res.ok) {
        setError("Could not record your acceptance - please try again.");
        return;
      }
      onAccepted();
    } catch {
      setError("Network error - please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="space-y-3 rounded-[var(--db-radius-card)] p-[var(--db-card-padding)]"
      style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
    >
      <label className="flex items-start gap-2 text-[14px]" style={{ color: "var(--db-text-primary)" }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded"
          style={{ accentColor: "var(--db-accent)", borderColor: "var(--db-border)" }}
        />
        <span>
          I have read and agree to the{" "}
          <Link href="/legal/terms" target="_blank" rel="noreferrer" className="font-medium" style={{ color: "var(--db-accent)" }}>
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/legal/disclaimer"
            target="_blank"
            rel="noreferrer"
            className="font-medium"
            style={{ color: "var(--db-accent)" }}
          >
            Ad Spend &amp; Media Buying Disclaimer
          </Link>
          .
        </span>
      </label>

      {error && (
        <p className="text-[13px]" style={{ color: "var(--db-danger-text)" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleAccept}
        disabled={!checked || submitting}
        className="w-full rounded-[var(--db-radius-pill)] px-4 py-2.5 text-[15px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: "var(--db-accent)" }}
      >
        {submitting ? "Saving…" : "Agree & continue"}
      </button>
    </div>
  );
}
