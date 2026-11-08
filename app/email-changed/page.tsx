"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function EmailChangedPage() {
  return (
    <Suspense fallback={null}>
      <EmailChangedPageInner />
    </Suspense>
  );
}

function EmailChangedPageInner() {
  const ok = useSearchParams().get("ok") !== "0";

  return (
    <main className="dashboard-shell flex flex-1 items-center justify-center px-4 py-16">
      <div
        className="w-full max-w-sm rounded-[var(--db-radius-card)] p-[var(--db-card-padding)] text-center"
        style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
      >
        {ok ? (
          <p className="text-[14px]" style={{ color: "var(--db-text-primary)" }}>
            Your email has been updated. You can now log in with the new address.
          </p>
        ) : (
          <p className="text-[14px]" style={{ color: "var(--db-text-primary)" }}>
            This link is invalid or has expired. Request a new email change from Settings.
          </p>
        )}
        <Link
          href="/login"
          className="mt-4 inline-block text-[14px] font-medium"
          style={{ color: "var(--db-accent)" }}
        >
          Go to log in
        </Link>
      </div>
    </main>
  );
}
