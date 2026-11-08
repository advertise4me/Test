"use client";

import { useRouter } from "next/navigation";
import TermsClickwrap from "@/components/legal/TermsClickwrap";

// Version-change re-acceptance gate (Phase 5b): app/(dashboard)/layout.tsx
// redirects here, server-side, whenever a logged-in user's stored
// terms_acceptances version doesn't match the current Terms of Service
// version. Reuses the same clickwrap as the pre-connect gate on "/".
export default function AcceptTermsPage() {
  const router = useRouter();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Our terms have been updated</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Please review and re-accept the Terms of Service and Ad Spend & Media Buying Disclaimer to
            continue.
          </p>
        </div>

        <TermsClickwrap onAccepted={() => router.replace("/summary")} />
      </div>
    </main>
  );
}
