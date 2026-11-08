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
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm">
        {ok ? (
          <p className="text-sm text-zinc-700">
            Your email has been updated. You can now log in with the new address.
          </p>
        ) : (
          <p className="text-sm text-zinc-700">
            This link is invalid or has expired. Request a new email change from Settings.
          </p>
        )}
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-zinc-900 underline">
          Go to log in
        </Link>
      </div>
    </main>
  );
}
