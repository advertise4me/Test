"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SettingsResponse } from "@/lib/settingsTypes";
import SettingsCard from "./SettingsCard";

function formatLastSync(iso: string | null): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ConnectedAccountSection({ metaConnection }: { metaConnection: SettingsResponse["metaConnection"] }) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disconnect() {
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/disconnect", { method: "POST" });
      if (!res.ok) {
        setError("Could not disconnect right now - please try again.");
        return;
      }
      router.replace("/");
    } catch {
      setError("Network error - please try again.");
    } finally {
      setDisconnecting(false);
    }
  }

  if (!metaConnection.connected) {
    return (
      <SettingsCard title="Connected accounts">
        <p className="text-[14px]" style={{ color: "var(--db-text-secondary)" }}>
          No Meta ad account connected yet.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-[var(--db-radius-pill)] px-4 py-2 text-[14px] font-medium text-white"
          style={{ background: "var(--db-accent)" }}
        >
          Connect an account
        </button>
      </SettingsCard>
    );
  }

  const healthy = metaConnection.status === "connected";

  return (
    <SettingsCard title="Connected accounts">
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: healthy ? "var(--db-success-text)" : "var(--db-danger-text)" }}
          aria-label={healthy ? "Connected" : "Needs attention"}
        />
        <div className="min-w-0">
          <p className="text-[15px] font-medium" style={{ color: "var(--db-text-primary)" }}>
            {metaConnection.accountName ?? metaConnection.adAccountId}
          </p>
          <p className="text-[13px]" style={{ color: "var(--db-text-secondary)" }}>
            {metaConnection.adAccountId}
            {metaConnection.businessPortfolioName ? ` · ${metaConnection.businessPortfolioName}` : ""}
          </p>
          <p className="text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
            {healthy ? "Connected" : "Needs reconnecting"} · Last synced {formatLastSync(metaConnection.lastSyncAt)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-[var(--db-radius-pill)] px-4 py-2 text-[13px] font-medium"
          style={{ border: "var(--db-border-width) solid var(--db-border)", color: "var(--db-text-primary)" }}
        >
          Reconnect
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-[var(--db-radius-pill)] px-4 py-2 text-[13px] font-medium"
          style={{ border: "var(--db-border-width) solid var(--db-border)", color: "var(--db-text-primary)" }}
        >
          Switch ad account
        </button>
        {!confirmingDisconnect ? (
          <button
            type="button"
            onClick={() => setConfirmingDisconnect(true)}
            className="rounded-[var(--db-radius-pill)] px-4 py-2 text-[13px] font-medium"
            style={{ border: "var(--db-border-width) solid var(--db-danger-text)", color: "var(--db-danger-text)" }}
          >
            Disconnect
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[13px]" style={{ color: "var(--db-text-secondary)" }}>
              Disconnect this account?
            </span>
            <button
              type="button"
              onClick={disconnect}
              disabled={disconnecting}
              className="rounded-[var(--db-radius-pill)] px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
              style={{ background: "var(--db-danger-text)" }}
            >
              {disconnecting ? "Disconnecting…" : "Yes, disconnect"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDisconnect(false)}
              className="rounded-[var(--db-radius-pill)] px-3 py-1.5 text-[13px]"
              style={{ color: "var(--db-text-secondary)" }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[13px]" style={{ color: "var(--db-danger-text)" }}>
          {error}
        </p>
      )}

      <p className="text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
        A4M never stores your Meta password. You can remove our access anytime in Meta Business Settings.
      </p>
    </SettingsCard>
  );
}
