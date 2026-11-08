import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { generateRawToken, hashToken, tokenExpiryDate } from "@/lib/tokens";
import { sendEmailChangeVerification } from "@/lib/emailTemplates";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Starts the "change email" flow (Settings 6.2): the account's email only
// actually changes once the link built from this token is visited - see
// app/api/auth/verify-email-change/route.ts.
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

  const { newEmail } = (body ?? {}) as Record<string, unknown>;
  if (typeof newEmail !== "string" || !newEmail.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const normalized = normalizeEmail(newEmail);

  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) {
    return NextResponse.json({ error: "That email address is already in use." }, { status: 400 });
  }

  const rawToken = generateRawToken();
  await prisma.emailChangeToken.create({
    data: { userId, newEmail: normalized, tokenHash: hashToken(rawToken), expiresAt: tokenExpiryDate() },
  });

  const verifyUrl = `${req.nextUrl.origin}/api/auth/verify-email-change?token=${rawToken}`;
  await sendEmailChangeVerification(normalized, verifyUrl);

  return NextResponse.json({ ok: true });
}
