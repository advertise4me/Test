import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getCurrentTermsVersion } from "@/lib/legal";

// Layout-level shell (tab bar + the AI Summary header) shared by all four
// tabs: /summary, /chat, /ideate, /settings. Keeping it a route group means
// the existing /chat URL doesn't change.
//
// Also the version-change re-acceptance gate (Phase 5b): if a logged-in
// user's most recent terms_acceptances row doesn't match the current Terms
// of Service version (including no row at all), every authenticated tab
// redirects to /accept-terms until they re-accept. Not logged in at all is
// left alone - each tab's own client-side fetch already redirects that case
// to /login.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const userId = await getCurrentUserId();
  if (userId) {
    const latestAcceptance = await prisma.termsAcceptance.findFirst({
      where: { userId },
      orderBy: { acceptedAt: "desc" },
    });
    if (!latestAcceptance || latestAcceptance.termsVersion !== getCurrentTermsVersion()) {
      redirect("/accept-terms");
    }
  }

  return <DashboardShell>{children}</DashboardShell>;
}
