"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, inputClassName, inputStyle } from "@/components/dashboard/settings/Field";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error - please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard-shell flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-[22px] font-bold" style={{ color: "var(--db-text-primary)" }}>
            Reset your password
          </h1>
        </div>

        {sent ? (
          <div
            className="rounded-[var(--db-radius-card)] p-[var(--db-card-padding)] text-center"
            style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
          >
            <p className="text-[14px]" style={{ color: "var(--db-text-primary)" }}>
              If an account exists for {email}, we&apos;ve sent a link to reset the password. Check your inbox.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-[14px] font-medium"
              style={{ color: "var(--db-accent)" }}
            >
              Back to log in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-[var(--db-radius-card)] p-[var(--db-card-padding)]"
            style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
          >
            <Field label="Email">
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClassName}
                style={inputStyle}
              />
            </Field>

            {error && (
              <p className="text-[13px]" style={{ color: "var(--db-danger-text)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-[var(--db-radius-pill)] px-4 py-2.5 text-[15px] font-medium text-white disabled:opacity-50"
              style={{ background: "var(--db-accent)" }}
            >
              {submitting ? "Sending…" : "Send reset link"}
            </button>

            <p className="text-center text-[14px]">
              <Link href="/login" className="font-medium" style={{ color: "var(--db-text-primary)" }}>
                Back to log in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
