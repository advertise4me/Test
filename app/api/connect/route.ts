import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { MetaApiError, getAdAccount, normalizeAdAccountId } from "@/mcp-server/meta-client";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { accessToken, adAccountId } = (body ?? {}) as Record<string, unknown>;
  if (typeof accessToken !== "string" || accessToken.trim().length === 0) {
    return NextResponse.json({ error: "A Meta access token is required." }, { status: 400 });
  }
  if (typeof adAccountId !== "string" || adAccountId.trim().length === 0) {
    return NextResponse.json({ error: "An ad account ID is required." }, { status: 400 });
  }

  const normalizedAccountId = normalizeAdAccountId(adAccountId);

  try {
    const account = await getAdAccount({
      accessToken: accessToken.trim(),
      adAccountId: normalizedAccountId,
    });

    const session = await getSession();
    session.metaAccessToken = accessToken.trim();
    session.adAccountId = normalizedAccountId;
    session.accountName = account.name;
    session.currency = account.currency;
    session.connectedAt = Date.now();
    await session.save();

    return NextResponse.json({ ok: true, accountName: account.name, currency: account.currency });
  } catch (error) {
    const message =
      error instanceof MetaApiError
        ? error.message
        : "Could not verify this ad account. Double-check the access token and ad account ID.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
