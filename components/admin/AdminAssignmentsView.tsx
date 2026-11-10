"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { dashboardIconStrokeWidth, dashboardType } from "@/lib/theme/dashboard";
import type { AdminAdAccountRow } from "@/lib/adminTypes";
import AdminAccountRow from "./AdminAccountRow";

export default function AdminAssignmentsView() {
  const [accounts, setAccounts] = useState<AdminAdAccountRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = accounts === null && error === null;

  const load = useCallback(() => {
    fetch("/api/admin/ad-accounts")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load ad accounts.");
        return body.accounts as AdminAdAccountRow[];
      })
      .then((data) => {
        setAccounts(data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="dashboard-shell mx-auto flex min-h-dvh w-full max-w-2xl flex-1 flex-col px-4 py-10">
      <Link
        href="/settings"
        className="mb-6 inline-flex items-center gap-1 text-[14px]"
        style={{ color: "var(--db-text-secondary)" }}
      >
        <ChevronLeft size={16} strokeWidth={dashboardIconStrokeWidth} />
        Back
      </Link>

      <h1 className={dashboardType.screenTitle} style={{ color: "var(--db-text-primary)" }}>
        Ad account assignments
      </h1>
      <p className="mt-1 text-[13px]" style={{ color: "var(--db-text-secondary)" }}>
        Every ad account the Meta System User token can see, and who it&apos;s assigned to.
      </p>

      <div
        className="mt-6 rounded-[var(--db-radius-card)] p-[var(--db-card-padding)]"
        style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
      >
        {loading && (
          <p className="text-[14px]" style={{ color: "var(--db-text-secondary)" }}>
            Loading accounts…
          </p>
        )}

        {!loading && error && (
          <div
            className="rounded-[var(--db-radius-pill)] px-3 py-3 text-[14px]"
            style={{ background: "var(--db-danger-bg)", color: "var(--db-danger-text)" }}
          >
            {error}
          </div>
        )}

        {!loading && !error && accounts && accounts.length === 0 && (
          <p className="text-[14px]" style={{ color: "var(--db-text-secondary)" }}>
            No ad accounts are visible to the Meta System User token yet.
          </p>
        )}

        {!loading && !error && accounts && accounts.length > 0 && (
          <div className="space-y-3">
            {accounts.map((account) => (
              <AdminAccountRow key={account.adAccountId} account={account} onChanged={load} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
