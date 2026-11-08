"use client";

import { useState } from "react";
import { AlertTriangle, DollarSign } from "lucide-react";
import type { ConfirmAction } from "@/lib/parseAssistantContent";
import { dashboardIconStrokeWidth } from "@/lib/theme/dashboard";

export type ActionResolution =
  | { status: "confirmed"; detail: string }
  | { status: "cancelled" }
  | { status: "error"; detail: string };

/**
 * The confirmation gate's UI surface: a distinct card (never a plain text
 * bubble) for a Meta write action the model has proposed but not yet run.
 * Nothing on the account changes until Confirm is pressed here - see
 * app/api/meta/confirm-action/route.ts, the only route that actually calls
 * Meta for one of these.
 */
export default function ConfirmActionCard({
  action,
  resolution,
  onResolve,
}: {
  action: ConfirmAction;
  resolution?: ActionResolution;
  onResolve: (id: string, resolution: ActionResolution) => void;
}) {
  const [working, setWorking] = useState<"confirm" | "cancel" | null>(null);

  async function send(decision: "confirm" | "cancel") {
    if (working || resolution) return;
    setWorking(decision);
    try {
      const res = await fetch("/api/meta/confirm-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: action.id, decision }),
      });
      const data = await res.json();
      if (!res.ok) {
        onResolve(action.id, { status: "error", detail: data.error || "Something went wrong." });
        return;
      }
      if (decision === "cancel") {
        onResolve(action.id, { status: "cancelled" });
      } else {
        onResolve(action.id, { status: "confirmed", detail: data.detail || "Done." });
      }
    } catch {
      onResolve(action.id, { status: "error", detail: "Network error - please try again." });
    } finally {
      setWorking(null);
    }
  }

  if (resolution?.status === "confirmed") {
    return (
      <div
        className="mt-2 rounded-[var(--db-radius-card)] p-4 text-sm"
        style={{ background: "var(--db-success-bg)", color: "var(--db-success-text)" }}
      >
        ✅ {resolution.detail}
      </div>
    );
  }
  if (resolution?.status === "cancelled") {
    return (
      <div
        className="mt-2 rounded-[var(--db-radius-card)] p-4 text-sm"
        style={{
          background: "var(--db-surface)",
          border: "var(--db-border-width) solid var(--db-border)",
          color: "var(--db-text-secondary)",
        }}
      >
        Cancelled - nothing was changed on your Meta account.
      </div>
    );
  }
  if (resolution?.status === "error") {
    return (
      <div
        className="mt-2 rounded-[var(--db-radius-card)] p-4 text-sm"
        style={{ background: "var(--db-danger-bg)", color: "var(--db-danger-text)" }}
      >
        ⚠️ {resolution.detail}
      </div>
    );
  }

  // Spend-affecting actions (create/edit/launch/budget change on a campaign
  // or ad set - see lib/metaWriteGate.ts's spendAffecting flag) get the
  // formal spend-approval sheet: the exact required fields and copy, plus
  // "Approve & launch" instead of a generic "Confirm". Non-spend write
  // actions (e.g. pausing something, creating an ad creative) keep the
  // simpler card below.
  if (action.spendAffecting && action.spendDetails) {
    const { objectName, budget, dateRange } = action.spendDetails;
    return (
      <div
        className="mt-2 rounded-[var(--db-radius-card)] p-[var(--db-card-padding)]"
        style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-warning-bg)" }}
      >
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle size={18} strokeWidth={dashboardIconStrokeWidth} color="var(--db-warning-text)" />
          <p className="text-[15px] font-semibold" style={{ color: "var(--db-text-primary)" }}>
            Review before you launch
          </p>
        </div>

        <dl className="mb-3 space-y-1.5 text-[14px]">
          <div className="flex justify-between gap-3">
            <dt style={{ color: "var(--db-text-secondary)" }}>Campaign / ad set</dt>
            <dd className="text-right font-medium" style={{ color: "var(--db-text-primary)" }}>
              {objectName}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt style={{ color: "var(--db-text-secondary)" }}>Budget</dt>
            <dd className="text-right font-medium" style={{ color: "var(--db-text-primary)" }}>
              {budget}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt style={{ color: "var(--db-text-secondary)" }}>Date range</dt>
            <dd className="text-right font-medium" style={{ color: "var(--db-text-primary)" }}>
              {dateRange}
            </dd>
          </div>
        </dl>

        <div
          className="mb-3 flex items-start gap-2 rounded-[var(--db-radius-pill)] p-3 text-[13px] font-semibold"
          style={{ background: "var(--db-warning-bg)", color: "var(--db-warning-text)" }}
        >
          <DollarSign size={16} strokeWidth={dashboardIconStrokeWidth} className="mt-0.5 shrink-0" />
          <span>This will spend money on your Meta ad account, billed to you by Meta.</span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => send("confirm")}
            disabled={working !== null}
            className="rounded-[var(--db-radius-pill)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--db-accent)" }}
          >
            {working === "confirm" ? "Approving…" : "Approve & launch"}
          </button>
          <button
            type="button"
            onClick={() => send("cancel")}
            disabled={working !== null}
            className="rounded-[var(--db-radius-pill)] px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{
              background: "var(--db-surface-2)",
              color: "var(--db-text-primary)",
              border: "var(--db-border-width) solid var(--db-border)",
            }}
          >
            {working === "cancel" ? "Cancelling…" : "Cancel"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mt-2 rounded-[var(--db-radius-card)] p-4"
      style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
    >
      <p className="mb-2 text-sm font-semibold" style={{ color: "var(--db-text-primary)" }}>
        ⚠️ Confirm this change to your Meta ad account
      </p>
      <p className="mb-3 text-sm" style={{ color: "var(--db-text-secondary)" }}>
        {action.summary}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => send("confirm")}
          disabled={working !== null}
          className="rounded-[var(--db-radius-pill)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--db-accent)" }}
        >
          {working === "confirm" ? "Confirming…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => send("cancel")}
          disabled={working !== null}
          className="rounded-[var(--db-radius-pill)] px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{
            background: "var(--db-surface-2)",
            color: "var(--db-text-primary)",
            border: "var(--db-border-width) solid var(--db-border)",
          }}
        >
          {working === "cancel" ? "Cancelling…" : "Cancel"}
        </button>
      </div>
    </div>
  );
}
