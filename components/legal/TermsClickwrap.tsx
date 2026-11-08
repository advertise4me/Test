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
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <label className="flex items-start gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300"
        />
        <span>
          I have read and agree to the{" "}
          <Link href="/legal/terms" target="_blank" rel="noreferrer" className="font-medium text-zinc-900 underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/legal/disclaimer"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-zinc-900 underline"
          >
            Ad Spend &amp; Media Buying Disclaimer
          </Link>
          .
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleAccept}
        disabled={!checked || submitting}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Agree & continue"}
      </button>
    </div>
  );
}
