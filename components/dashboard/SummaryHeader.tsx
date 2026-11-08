"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { initialsFromEmail } from "@/lib/initials";

export default function SummaryHeader({ email }: { email: string | null | undefined }) {
  const router = useRouter();

  return (
    <header
      className="flex shrink-0 items-center justify-between px-[var(--db-gutter)] py-4"
      style={{ borderBottom: "var(--db-border-width) solid var(--db-border)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: "linear-gradient(135deg, var(--db-accent), var(--db-accent-strong))",
          }}
        >
          <Sparkles size={20} strokeWidth={1.75} color="#ffffff" />
        </div>
        <div>
          <p className="text-[15px] font-bold" style={{ color: "var(--db-text-primary)" }}>
            A4M
          </p>
          <p className="text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
            Advertise For Me
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push("/settings")}
        aria-label="Open settings"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
        style={{
          background: "var(--db-surface-2)",
          color: "var(--db-text-primary)",
          border: "var(--db-border-width) solid var(--db-border)",
        }}
      >
        {initialsFromEmail(email)}
      </button>
    </header>
  );
}
