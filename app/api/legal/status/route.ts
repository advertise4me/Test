import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getCurrentTermsVersion } from "@/lib/legal";

// Tells the client whether the logged-in user has already accepted the
// *current* terms version, so e.g. the connect page doesn't re-show the
// clickwrap to a user who already accepted (reconnecting after a disconnect).
export async function GET() {
  const userId = await getCurrentUserId();
  const currentVersion = getCurrentTermsVersion();
  if (!userId) {
    return NextResponse.json({ accepted: false, acceptedVersion: null, currentVersion });
  }

  const latest = await prisma.termsAcceptance.findFirst({
    where: { userId },
    orderBy: { acceptedAt: "desc" },
  });

  return NextResponse.json({
    accepted: latest?.termsVersion === currentVersion,
    acceptedVersion: latest?.termsVersion ?? null,
    currentVersion,
  });
}
