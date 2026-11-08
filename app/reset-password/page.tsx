"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Field, inputClassName, inputStyle } from "@/components/dashboard/settings/Field";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}

function ResetPasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("Network error - please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <main className="dashboard-shell flex flex-1 items-center justify-center px-4 py-16">
        <p className="text-[14px]" style={{ color: "var(--db-text-secondary)" }}>
          This link is missing a reset token.{" "}
          <Link href="/forgot-password" className="font-medium" style={{ color: "var(--db-text-primary)" }}>
            Request a new one
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="dashboard-shell flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-[22px] font-bold" style={{ color: "var(--db-text-primary)" }}>
            Choose a new password
          </h1>
        </div>

        {done ? (
          <div
            className="rounded-[var(--db-radius-card)] p-[var(--db-card-padding)] text-center"
            style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
          >
            <p className="text-[14px]" style={{ color: "var(--db-text-primary)" }}>
              Password changed - redirecting you to log in…
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-[var(--db-radius-card)] p-[var(--db-card-padding)]"
            style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
          >
            <Field label="New password">
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClassName}
                style={inputStyle}
              />
              <p className="mt-1.5 text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
                At least 8 characters.
              </p>
            </Field>
            <Field label="Confirm new password">
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {submitting ? "Saving…" : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
