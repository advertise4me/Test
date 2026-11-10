import "server-only";
import { prisma } from "@/lib/db";
import { normalizeAdAccountId } from "@/mcp-server/meta-client";

// Phase A of the Business-Manager-system-user-token migration (see
// AGENTS.md). Every Meta API call for every user now goes through exactly
// one token - there is no more per-user access token to read. Which ad
// account(s) a given user may see is a separate, server-only lookup against
// AdAccountAssignment, keyed by the logged-in user's id from the session -
// never by anything the client/request supplied.

/**
 * The single Meta access token used for every Meta API call, for every
 * user. Throws a clear error (never a silent undefined -> obscure Graph API
 * 400) if the agency owner hasn't set it yet.
 */
export function getMetaSystemUserToken(): string {
  const token = process.env.META_SYSTEM_USER_TOKEN;
  if (!token) {
    throw new Error(
      "META_SYSTEM_USER_TOKEN is not configured on the server. The agency owner needs to generate a " +
        "Business Manager System User token in Meta Business Settings and set it as META_SYSTEM_USER_TOKEN.",
    );
  }
  return token;
}

export interface AdAccountAssignmentInfo {
  /** Normalized to the "act_..." form the Graph API expects. */
  adAccountId: string;
  adAccountName: string | null;
  assignedAt: Date;
}

/**
 * Looks up which ad account (if any) the admin has assigned to this user,
 * from AdAccountAssignment - the only source of truth for "which account
 * does this user see." Returns null if nothing is assigned yet. Unlike
 * resolveUserAdAccount below, this never touches META_SYSTEM_USER_TOKEN, so
 * callers that only need to display the assignment (Settings, the session
 * status check) don't fail just because the token isn't configured yet.
 *
 * Known simplification (Phase A): a user can hold multiple assignments, but
 * this picks only the most-recently-assigned one. A proper account-switcher
 * UI for multi-account users is left to a later phase.
 */
export async function getUserAdAccountAssignment(userId: string): Promise<AdAccountAssignmentInfo | null> {
  const assignment = await prisma.adAccountAssignment.findFirst({
    where: { userId },
    orderBy: { assignedAt: "desc" },
  });
  if (!assignment) return null;

  return {
    adAccountId: normalizeAdAccountId(assignment.adAccountId),
    adAccountName: assignment.adAccountName,
    assignedAt: assignment.assignedAt,
  };
}

export interface ResolvedAdAccount {
  adAccountId: string;
  adAccountName: string | null;
  accessToken: string;
}

/**
 * Resolves the Meta ad account a logged-in user is allowed to use, and the
 * token to call it with. Returns null if nothing is assigned yet, so
 * callers can surface a clear "no ad account assigned" state instead of
 * erroring.
 */
export async function resolveUserAdAccount(userId: string): Promise<ResolvedAdAccount | null> {
  const assignment = await getUserAdAccountAssignment(userId);
  if (!assignment) return null;

  return {
    adAccountId: assignment.adAccountId,
    adAccountName: assignment.adAccountName,
    accessToken: getMetaSystemUserToken(),
  };
}
