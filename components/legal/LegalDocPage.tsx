import Link from "next/link";
import type { LegalDoc } from "@/lib/legal";
import LegalMarkdown from "./LegalMarkdown";

/** Shared chrome for a single scrollable legal/licenses page (app/legal/*). */
export default function LegalDocPage({ doc, backHref = "/" }: { doc: LegalDoc; backHref?: string }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10">
      <Link href={backHref} className="mb-6 text-sm text-zinc-500 underline underline-offset-2">
        ← Back
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{doc.title}</h1>
      <p className="mt-1 text-xs text-zinc-500">
        Version {doc.version} · Last updated {doc.lastUpdated}
      </p>

      {doc.draft && (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          DRAFT — pending legal review. This is placeholder language and is not final.
        </div>
      )}

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <LegalMarkdown content={doc.body} />
      </div>
    </main>
  );
}
