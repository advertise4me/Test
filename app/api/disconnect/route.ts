import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";

// Disconnects the Meta ad account but keeps the user logged in. To log out
// entirely, use /api/auth/logout.
export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  await prisma.metaConnection.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}
