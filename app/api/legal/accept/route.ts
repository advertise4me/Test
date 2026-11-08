import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getCurrentTermsVersion } from "@/lib/legal";

// Records one clickwrap acceptance event (Phase 5b). Called both from the
// pre-connect gate (app/page.tsx) on first sign-up and from the
// version-change re-accept screen (app/accept-terms/page.tsx). Always
// records the *current* Terms of Service version - the client never gets
// to say which version it's accepting.
function clientIp(req: NextRequest): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  const termsVersion = getCurrentTermsVersion();

  await prisma.termsAcceptance.create({
    data: {
      userId,
      termsVersion,
      ipAddress: clientIp(req),
      userAgent: req.headers.get("user-agent"),
    },
  });

  return NextResponse.json({ ok: true, termsVersion });
}
