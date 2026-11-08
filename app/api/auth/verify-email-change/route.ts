import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

// Visited from the link in the "change email" verification email - this is
// the only place User.email actually changes (Settings 6.2). Deliberately
// doesn't require a logged-in session: the link may be opened on a
// different device than the one that requested the change. Possession of
// the single-use token *is* the proof that this request is legitimate
// (it was only ever sent to the new address).
export async function GET(req: NextRequest) {
  const rawToken = req.nextUrl.searchParams.get("token");
  if (!rawToken) {
    return NextResponse.redirect(new URL("/email-changed?ok=0", req.url));
  }

  const tokenHash = hashToken(rawToken);
  const record = await prisma.emailChangeToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/email-changed?ok=0", req.url));
  }

  const conflict = await prisma.user.findUnique({ where: { email: record.newEmail } });
  if (conflict && conflict.id !== record.userId) {
    return NextResponse.redirect(new URL("/email-changed?ok=0", req.url));
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { email: record.newEmail } }),
    prisma.emailChangeToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return NextResponse.redirect(new URL("/email-changed?ok=1", req.url));
}
