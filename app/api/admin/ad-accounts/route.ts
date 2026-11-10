import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AdminAccessError, requireAdminUserId } from "@/lib/admin";
import { getMetaSystemUserToken } from "@/lib/adAccountAccess";
import { MetaApiError, listAdAccountsForToken, normalizeAdAccountId } from "@/mcp-server/meta-client";
import type { AdminAdAccountsResponse } from "@/lib/adminTypes";

// Lists every ad account the shared Meta System User token can see
// (GET /me/adaccounts), cross-referenced against AdAccountAssignment so the
// admin page can show, per account, whether it's unassigned or which user's
// email it's assigned to. The Meta call is kept separate from the
// AdAccountAssignment read so a missing/invalid token still renders a clear
// error instead of a 500 with no explanation.
export async function GET() {
  try {
    await requireAdminUserId();
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  let metaAccounts: Array<{ id: string; name: string | null; account_status: number; currency: string | null }>;
  try {
    const token = getMetaSystemUserToken();
    const result = await listAdAccountsForToken(token);
    metaAccounts = result.data;
  } catch (error) {
    const message =
      error instanceof MetaApiError
        ? `Meta API error: ${error.message}`
        : (error as Error).message;
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const assignments = await prisma.adAccountAssignment.findMany({
    include: { user: { select: { email: true } } },
  });
  const assignmentByAccountId = new Map(assignments.map((a) => [normalizeAdAccountId(a.adAccountId), a]));

  const accounts: AdminAdAccountsResponse["accounts"] = metaAccounts.map((acc) => {
    const adAccountId = normalizeAdAccountId(acc.id);
    const assignment = assignmentByAccountId.get(adAccountId);
    return {
      adAccountId,
      name: acc.name ?? assignment?.adAccountName ?? null,
      accountStatus: acc.account_status,
      currency: acc.currency ?? null,
      assignedToEmail: assignment?.user?.email ?? null,
      assignedAt: assignment?.assignedAt?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ accounts } satisfies AdminAdAccountsResponse);
}
