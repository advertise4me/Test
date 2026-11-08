"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <p className="text-sm text-zinc-600">
          This link is missing a reset token.{" "}
          <Link href="/forgot-password" className="font-medium text-zinc-900 underline">
            Request a new one
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        </div>

        {done ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-zinc-700">Password changed - redirecting you to log in…</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
              <p className="mt-1 text-xs text-zinc-500">At least 8 characters.</p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
