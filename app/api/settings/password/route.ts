import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";

const BCRYPT_ROUNDS = 12;

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

  const { currentPassword, newPassword } = (body ?? {}) as Record<string, unknown>;
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
