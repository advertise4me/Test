import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

const BCRYPT_ROUNDS = 12;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { token, password } = (body ?? {}) as Record<string, unknown>;
  if (typeof token !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Token and new password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "This reset link is invalid or has expired. Request a new one." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return NextResponse.json({ ok: true });
}
