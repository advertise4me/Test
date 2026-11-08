import { NextResponse } from "next/server";
import { getCurrentUserId, getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

// Deletes the account (Settings 6.2). The UI's two-step confirmation
// happens client-side before this is ever called - this route just does the
// deletion once asked.
//
// MetaConnection / DashboardConfig / EmailChangeToken / PasswordResetToken
// all have onDelete: Cascade on their User relation (see
// prisma/schema.prisma), so deleting the User row removes those
// automatically. WriteActionLog and AdActionApproval are a plain audit
// trail with no foreign key back to User (userId is just a string, kept
// even if an account is later deleted elsewhere in the codebase) - deleted
// explicitly here instead, since the account is actually going away.
//
// This does NOT touch anything in Meta: deleting the account disconnects
// our access to the ad account, but any campaigns/ad sets/ads already
// running in Meta keep running there until the user pauses them directly
// in Meta Ads Manager. The Settings UI says this before letting the delete
// happen - see components/dashboard/settings/SecuritySection.tsx.
export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  await prisma.$transaction([
    prisma.writeActionLog.deleteMany({ where: { userId } }),
    prisma.adActionApproval.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  const session = await getSession();
  session.destroy();

  return NextResponse.json({ ok: true });
}
