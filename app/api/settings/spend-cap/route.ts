import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";

// Stores an optional monthly spend cap (Settings 6.4). Not enforced
// anywhere yet - see the Phase 5a report for what a future phase would
// need to wire this up to (e.g. checking it in lib/metaWriteGate.ts before
// a budget-affecting write action goes through).
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

  const { monthlySpendCap } = (body ?? {}) as Record<string, unknown>;

  let value: number | null = null;
  if (monthlySpendCap !== null && monthlySpendCap !== undefined && monthlySpendCap !== "") {
    const parsed = typeof monthlySpendCap === "number" ? monthlySpendCap : Number(monthlySpendCap);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return NextResponse.json({ error: "Spend cap must be a positive number." }, { status: 400 });
    }
    value = parsed;
  }

  const user = await prisma.user.update({ where: { id: userId }, data: { monthlySpendCap: value } });
  return NextResponse.json({ ok: true, monthlySpendCap: user.monthlySpendCap });
}
