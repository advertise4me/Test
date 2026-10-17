import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { encryptToken } from "@/lib/crypto";
import { MetaApiError, getAdAccount, normalizeAdAccountId } from "@/mcp-server/meta-client";

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

  const { accessToken, adAccountId } = (body ?? {}) as Record<string, unknown>;
  if (typeof accessToken !== "string" || accessToken.trim().length === 0) {
    return NextResponse.json({ error: "A Meta access token is required." }, { status: 400 });
  }
  if (typeof adAccountId !== "string" || adAccountId.trim().length === 0) {
    return NextResponse.json({ error: "An ad account ID is required." }, { status: 400 });
  }

  const normalizedAccountId = normalizeAdAccountId(adAccountId);
  const trimmedToken = accessToken.trim();

  try {
    const account = await getAdAccount({
      accessToken: trimmedToken,
      adAccountId: normalizedAccountId,
    });

    await prisma.metaConnection.upsert({
      where: { userId },
      create: {
        userId,
        adAccountId: normalizedAccountId,
        accountName: account.name,
        currency: account.currency,
        accessTokenCiphertext: encryptToken(trimmedToken),
      },
      update: {
        adAccountId: normalizedAccountId,
        accountName: account.name,
        currency: account.currency,
        accessTokenCiphertext: encryptToken(trimmedToken),
      },
    });

    return NextResponse.json({ ok: true, accountName: account.name, currency: account.currency });
  } catch (error) {
    const message =
      error instanceof MetaApiError
        ? error.message
        : "Could not verify this ad account. Double-check the access token and ad account ID.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
