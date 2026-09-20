import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.metaAccessToken || !session.adAccountId) {
    return NextResponse.json({ connected: false });
  }
  return NextResponse.json({
    connected: true,
    adAccountId: session.adAccountId,
    accountName: session.accountName,
    currency: session.currency,
  });
}
