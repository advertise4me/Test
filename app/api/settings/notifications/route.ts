import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";

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

  const { weeklySummary, needsAttention, metaAccessLost } = (body ?? {}) as Record<string, unknown>;
  const data: Record<string, boolean> = {};
  if (typeof weeklySummary === "boolean") data.notifyWeeklySummary = weeklySummary;
  if (typeof needsAttention === "boolean") data.notifyNeedsAttention = needsAttention;
  if (typeof metaAccessLost === "boolean") data.notifyMetaAccessLost = metaAccessLost;

  const user = await prisma.user.update({ where: { id: userId }, data });

  return NextResponse.json({
    ok: true,
    notifications: {
      weeklySummary: user.notifyWeeklySummary,
      needsAttention: user.notifyNeedsAttention,
      metaAccessLost: user.notifyMetaAccessLost,
    },
  });
}
