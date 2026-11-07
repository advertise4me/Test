"use client";

import { useState } from "react";
import type { ConfirmAction } from "@/lib/parseAssistantContent";

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
      <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        ✅ {resolution.detail}
      </div>
    );
  }
  if (resolution?.status === "cancelled") {
    return (
      <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
        Cancelled - nothing was changed on your Meta account.
      </div>
    );
  }
  if (resolution?.status === "error") {
    return (
      <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        ⚠️ {resolution.detail}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="mb-2 text-sm font-semibold text-amber-900">⚠️ Confirm this change to your Meta ad account</p>
      <p className="mb-3 text-sm text-zinc-800">{action.summary}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => send("confirm")}
          disabled={working !== null}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {working === "confirm" ? "Confirming…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => send("cancel")}
          disabled={working !== null}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
        >
          {working === "cancel" ? "Cancelling…" : "Cancel"}
        </button>
      </div>
    </div>
  );
}
