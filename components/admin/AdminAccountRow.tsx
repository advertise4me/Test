"use client";

import { useEffect, useState } from "react";
import { formatAdAccountStatus } from "@/lib/adAccountStatus";
import type { AdminAdAccountRow as AdminAdAccountRowType, AdminUserSearchResult } from "@/lib/adminTypes";
import { inputClassName, inputStyle } from "@/components/dashboard/settings/Field";

const SEARCH_DEBOUNCE_MS = 250;

export default function AdminAccountRow({
  account,
  onChanged,
}: {
  account: AdminAdAccountRowType;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [suggestions, setSuggestions] = useState<AdminUserSearchResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const trimmedEmail = email.trim();

  useEffect(() => {
    if (!editing || trimmedEmail.length < 2) return;
    const handle = setTimeout(() => {
      fetch(`/api/admin/users/search?q=${encodeURIComponent(trimmedEmail)}`)
        .then((res) => res.json())
        .then((body: { users: AdminUserSearchResult[] }) => setSuggestions(body.users ?? []))
        .catch(() => setSuggestions([]));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [trimmedEmail, editing]);

  async function submitAssignment(userEmail: string | null) {
    setSubmitting(true);
    setRowError(null);
    try {
      const res = await fetch("/api/admin/ad-accounts/assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adAccountId: account.adAccountId, adAccountName: account.name, userEmail }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save that assignment.");
      setEditing(false);
      setEmail("");
      setSuggestions([]);
      onChanged();
    } catch (err) {
      setRowError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[var(--db-radius-pill)] px-3 py-3" style={{ background: "var(--db-surface-2)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium" style={{ color: "var(--db-text-primary)" }}>
            {account.name ?? account.adAccountId}
          </p>
          <p className="text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
            {account.adAccountId} · {formatAdAccountStatus(account.accountStatus)}
            {account.currency ? ` · ${account.currency}` : ""}
          </p>
        </div>

        {!editing && (
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span
              className="whitespace-nowrap rounded-[var(--db-radius-pill)] px-2.5 py-1 text-[12px] font-medium"
              style={{
                background: account.assignedToEmail ? "var(--db-success-bg)" : "var(--db-warning-bg)",
                color: account.assignedToEmail ? "var(--db-success-text)" : "var(--db-warning-text)",
              }}
            >
              {account.assignedToEmail ?? "Unassigned"}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-[12px] font-medium underline-offset-2 hover:underline"
                style={{ color: "var(--db-accent)" }}
              >
                {account.assignedToEmail ? "Reassign" : "Assign"}
              </button>
              {account.assignedToEmail && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => submitAssignment(null)}
                  className="text-[12px] font-medium underline-offset-2 hover:underline disabled:opacity-50"
                  style={{ color: "var(--db-danger-text)" }}
                >
                  Unassign
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {editing && (
        <div className="relative mt-3">
          <div className="flex gap-2">
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className={inputClassName}
              style={inputStyle}
            />
            <button
              type="button"
              disabled={submitting || email.trim().length === 0}
              onClick={() => submitAssignment(email.trim())}
              className="shrink-0 rounded-[var(--db-radius-pill)] px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-50"
              style={{ background: "var(--db-accent)" }}
            >
              {submitting ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setEditing(false);
                setEmail("");
                setRowError(null);
              }}
              className="shrink-0 rounded-[var(--db-radius-pill)] px-3 py-2.5 text-[14px]"
              style={{ color: "var(--db-text-secondary)" }}
            >
              Cancel
            </button>
          </div>

          {trimmedEmail.length >= 2 && suggestions.length > 0 && (
            <div
              className="mt-1.5 overflow-hidden rounded-[var(--db-radius-card)]"
              style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
            >
              {suggestions.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => submitAssignment(user.email)}
                  disabled={submitting}
                  className="block w-full px-3 py-2 text-left text-[13px] disabled:opacity-50"
                  style={{ color: "var(--db-text-primary)" }}
                >
                  {user.email}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {rowError && (
        <p className="mt-2 text-[12px]" style={{ color: "var(--db-danger-text)" }}>
          {rowError}
        </p>
      )}
    </div>
  );
}
