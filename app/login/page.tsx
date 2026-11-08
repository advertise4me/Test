"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { Field, inputClassName, inputStyle } from "@/components/dashboard/settings/Field";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode === "login" ? "login" : "signup"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      router.push("/");
    } catch {
      setError("Network error - please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard-shell flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark align="center" />
          <h1 className="mt-4 text-[22px] font-bold" style={{ color: "var(--db-text-primary)" }}>
            Ads Chat
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: "var(--db-text-secondary)" }}>
            {mode === "login" ? "Log in to your account" : "Create an account"}
          </p>
        </div>

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

          <Field label="Password">
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassName}
              style={inputStyle}
            />
            {mode === "signup" && (
              <p className="mt-1.5 text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
                At least 8 characters.
              </p>
            )}
            {mode === "login" && (
              <p className="mt-1.5 text-right text-[12px]">
                <Link href="/forgot-password" style={{ color: "var(--db-text-secondary)" }}>
                  Forgot password?
                </Link>
              </p>
            )}
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
            {submitting ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>

        <p className="mt-4 text-center text-[14px]" style={{ color: "var(--db-text-secondary)" }}>
          {mode === "login" ? (
            <>
              No account?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="font-medium"
                style={{ color: "var(--db-text-primary)" }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="font-medium"
                style={{ color: "var(--db-text-primary)" }}
              >
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
