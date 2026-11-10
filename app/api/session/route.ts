import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getUserAdAccountAssignment } from "@/lib/adAccountAccess";

// "Connected" used to mean "has a MetaConnection row" (the old per-user
// token flow). Since Phase A, it means "has an AdAccountAssignment row" -
// the admin-assigned shared-token model (see AGENTS.md).
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ loggedIn: false, assigned: false });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const assignment = await getUserAdAccountAssignment(userId);
  if (!assignment) {
    return NextResponse.json({ loggedIn: true, assigned: false, email: user?.email });
  }

  return NextResponse.json({
    loggedIn: true,
    assigned: true,
    email: user?.email,
    adAccountId: assignment.adAccountId,
    accountName: assignment.adAccountName,
  });
}
