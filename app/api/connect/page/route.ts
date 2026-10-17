import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";

// Sets which linked Facebook Page to post ads as, for connect flows where
// more than one candidate Page was found (see app/api/connect/route.ts).
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { pageId, pageName } = (body ?? {}) as Record<string, unknown>;
  if (typeof pageId !== "string" || pageId.trim().length === 0) {
    return NextResponse.json({ error: "A page ID is required." }, { status: 400 });
  }

  const connection = await prisma.metaConnection.findUnique({ where: { userId } });
  if (!connection) {
    return NextResponse.json({ error: "Connect a Meta ad account first." }, { status: 400 });
  }

  await prisma.metaConnection.update({
    where: { userId },
    data: {
      facebookPageId: pageId.trim(),
      facebookPageName: typeof pageName === "string" ? pageName : null,
    },
  });

  return NextResponse.json({ ok: true });
}
