import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ loggedIn: false, connected: false });
  }

  const connection = await prisma.metaConnection.findUnique({ where: { userId } });
  if (!connection) {
    return NextResponse.json({ loggedIn: true, connected: false });
  }

  return NextResponse.json({
    loggedIn: true,
    connected: true,
    adAccountId: connection.adAccountId,
    accountName: connection.accountName,
    currency: connection.currency,
  });
}
