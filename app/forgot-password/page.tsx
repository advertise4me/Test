"use client";

import { useState } from "react";
import Link from "next/link";

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
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        </div>

        {sent ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-zinc-700">
              If an account exists for {email}, we&apos;ve sent a link to reset the password. Check your inbox.
            </p>
            <Link href="/login" className="mt-4 inline-block text-sm font-medium text-zinc-900 underline">
              Back to log in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Send reset link"}
            </button>

            <p className="text-center text-sm text-zinc-600">
              <Link href="/login" className="font-medium text-zinc-900 underline">
                Back to log in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
