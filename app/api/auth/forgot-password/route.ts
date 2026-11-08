import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateRawToken, hashToken, tokenExpiryDate } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/emailTemplates";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Logged-out "forgot password" flow (Settings 6.2 / the login page). Always
// responds ok, whether or not the address has an account, so this can't be
// used to probe which emails are registered.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { email } = (body ?? {}) as Record<string, unknown>;
  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (user) {
    const rawToken = generateRawToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt: tokenExpiryDate() },
    });
    const resetUrl = `${req.nextUrl.origin}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  }

  return NextResponse.json({ ok: true });
}
