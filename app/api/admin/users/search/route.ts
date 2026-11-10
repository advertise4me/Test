import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AdminAccessError, requireAdminUserId } from "@/lib/admin";
import type { AdminUserSearchResult } from "@/lib/adminTypes";

// Backs the email search box on the admin assignment page - a short
// case-insensitive substring match, not a full lookup, so the admin can
// find a user without knowing their exact email.
export async function GET(req: NextRequest) {
  try {
    await requireAdminUserId();
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ users: [] satisfies AdminUserSearchResult[] });
  }

  const users = await prisma.user.findMany({
    where: { email: { contains: q } },
    select: { id: true, email: true },
    orderBy: { email: "asc" },
    take: 8,
  });

  return NextResponse.json({ users } satisfies { users: AdminUserSearchResult[] });
}
