import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { LegalDoc } from "@/lib/legal";
import { dashboardIconStrokeWidth, dashboardType } from "@/lib/theme/dashboard";
import LegalMarkdown from "./LegalMarkdown";

/** Shared chrome for a single scrollable legal/licenses page (app/legal/*). */
export default function LegalDocPage({ doc, backHref = "/" }: { doc: LegalDoc; backHref?: string }) {
  return (
    <main className="dashboard-shell mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10">
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-1 text-[14px]"
        style={{ color: "var(--db-text-secondary)" }}
      >
        <ChevronLeft size={16} strokeWidth={dashboardIconStrokeWidth} />
        Back
      </Link>

      <h1 className={dashboardType.screenTitle} style={{ color: "var(--db-text-primary)" }}>
        {doc.title}
      </h1>
      <p className="mt-1 text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
        Version {doc.version} · Last updated {doc.lastUpdated}
      </p>

      {doc.draft && (
        <div
          className="mt-4 rounded-[var(--db-radius-pill)] px-3 py-2 text-[12px] font-medium"
          style={{ background: "var(--db-warning-bg)", color: "var(--db-warning-text)" }}
        >
          DRAFT — pending legal review. This is placeholder language and is not final.
        </div>
      )}

      <div
        className="mt-6 rounded-[var(--db-radius-card)] p-[var(--db-card-padding)]"
        style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
      >
        <LegalMarkdown content={doc.body} />
      </div>
    </main>
  );
}
