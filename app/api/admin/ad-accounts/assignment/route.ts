import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AdminAccessError, requireAdminUserId } from "@/lib/admin";
import { normalizeAdAccountId } from "@/mcp-server/meta-client";

// Creates/updates an AdAccountAssignment row. userEmail present -> assign
// (or reassign, if the row already belongs to someone else); userEmail null
// -> unassign. Either way the row is upserted rather than deleted, so the
// cached adAccountName survives even while the account is unassigned (see
// prisma/schema.prisma's AdAccountAssignment comment).
export async function POST(req: NextRequest) {
  let adminUserId: string;
  try {
    adminUserId = await requireAdminUserId();
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { adAccountId, adAccountName, userEmail } = (body ?? {}) as Record<string, unknown>;

  if (typeof adAccountId !== "string" || adAccountId.trim().length === 0) {
    return NextResponse.json({ error: "adAccountId is required." }, { status: 400 });
  }
  if (userEmail !== null && typeof userEmail !== "string") {
    return NextResponse.json({ error: "userEmail must be a string or null to unassign." }, { status: 400 });
  }

  const normalizedAccountId = normalizeAdAccountId(adAccountId);
  const cachedName = typeof adAccountName === "string" && adAccountName.trim().length > 0 ? adAccountName.trim() : null;

  if (userEmail === null) {
    const existing = await prisma.adAccountAssignment.findUnique({ where: { adAccountId: normalizedAccountId } });
    if (!existing) {
      return NextResponse.json({ error: "This account is not currently assigned to anyone." }, { status: 404 });
    }
    await prisma.adAccountAssignment.update({
      where: { adAccountId: normalizedAccountId },
      data: { userId: null, assignedBy: adminUserId, assignedAt: new Date() },
    });
    return NextResponse.json({ ok: true, assignedToEmail: null });
  }

  const normalizedEmail = userEmail.trim().toLowerCase();
  const targetUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!targetUser) {
    return NextResponse.json({ error: `No user found with email "${normalizedEmail}".` }, { status: 404 });
  }

  await prisma.adAccountAssignment.upsert({
    where: { adAccountId: normalizedAccountId },
    create: {
      adAccountId: normalizedAccountId,
      adAccountName: cachedName,
      userId: targetUser.id,
      assignedBy: adminUserId,
    },
    update: {
      adAccountName: cachedName ?? undefined,
      userId: targetUser.id,
      assignedBy: adminUserId,
      assignedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, assignedToEmail: targetUser.email });
}
