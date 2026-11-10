import Link from "next/link";
import { AlertTriangle, MessageCircleOff } from "lucide-react";
import type { PeriodKey } from "@/lib/period";
import { dashboardType } from "@/lib/theme/dashboard";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-[var(--db-radius-card)] p-8 text-center"
      style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
    >
      {children}
    </div>
  );
}

const NO_SPEND_PHRASE: Record<PeriodKey, string> = {
  today: "No ads ran today",
  yesterday: "No ads ran yesterday",
  this_week: "No ads ran this week",
  last_7_days: "No ads ran in the last 7 days",
  last_30_days: "No ads ran in the last 30 days",
  last_60_days: "No ads ran in the last 60 days",
  this_month: "No ads ran this month",
  last_month: "No ads ran last month",
};

export function NoSpendCard({ period }: { period: PeriodKey }) {
  return (
    <Card>
      <MessageCircleOff size={28} strokeWidth={1.75} color="var(--db-text-secondary)" />
      <p className={dashboardType.cardTitle} style={{ color: "var(--db-text-primary)" }}>
        {NO_SPEND_PHRASE[period]}
      </p>
      <p className="text-[14px]" style={{ color: "var(--db-text-secondary)" }}>
        There&apos;s nothing to summarize yet - ask for ideas to get something running.
      </p>
      <Link
        href="/chat"
        className="mt-1 rounded-[var(--db-radius-pill)] px-4 py-2 text-[14px] font-semibold text-white"
        style={{ background: "var(--db-accent)" }}
      >
        Get recommendations
      </Link>
    </Card>
  );
}

// Under the shared-token model (Phase A), a "token expired" error means the
// one META_SYSTEM_USER_TOKEN itself is invalid - an agency-side problem the
// admin has to fix in Meta Business Settings, not something any individual
// client can reconnect themselves. So, unlike the old per-user flow, there's
// no action button here.
export function TokenExpiredBanner() {
  return (
    <div
      className="flex items-center gap-3 rounded-[var(--db-radius-card)] p-[var(--db-card-padding)]"
      style={{ background: "var(--db-danger-bg)" }}
    >
      <AlertTriangle size={20} strokeWidth={1.75} className="shrink-0" color="var(--db-danger-text)" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold" style={{ color: "var(--db-danger-text)" }}>
          We&apos;re having trouble reaching your ad account
        </p>
        <p className="text-[13px]" style={{ color: "var(--db-danger-text)" }}>
          We&apos;ve been notified and are looking into it - no action needed on your end.
        </p>
      </div>
    </div>
  );
}

export function LoadErrorCard({ message }: { message: string }) {
  return (
    <Card>
      <AlertTriangle size={28} strokeWidth={1.75} color="var(--db-danger-text)" />
      <p className={dashboardType.cardTitle} style={{ color: "var(--db-text-primary)" }}>
        Couldn&apos;t load your summary
      </p>
      <p className="text-[14px]" style={{ color: "var(--db-text-secondary)" }}>
        {message}
      </p>
    </Card>
  );
}

export function LearningPhaseNote() {
  return (
    <div
      className="rounded-[var(--db-radius-pill)] px-3 py-2 text-[13px]"
      style={{ background: "var(--db-warning-bg)", color: "var(--db-warning-text)" }}
    >
      Meta is still learning how to deliver some of your ads best - this usually settles down after a few days.
    </div>
  );
}
