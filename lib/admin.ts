import "server-only";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";

// The one agency-owner account - see AGENTS.md Phase A. Compared
// case-insensitively; lib/auth.ts already normalizes every stored User.email
// to lowercase, so a plain lowercase compare is enough here.
const ADMIN_EMAIL = "admin@advertise4me.com";

/**
 * Idempotently sets isAdmin to match whether this user's email is the one
 * agency-owner address, flipping it back off too if it was ever set for a
 * different account. Call this at login and at signup so isAdmin never
 * drifts from the single source of truth (the email), without needing a
 * one-off migration data backfill.
 */
export async function ensureAdminFlag(userId: string, email: string): Promise<boolean> {
  const isAdmin = email.trim().toLowerCase() === ADMIN_EMAIL;
  await prisma.user.update({ where: { id: userId }, data: { isAdmin } });
  return isAdmin;
}

/** Thrown by requireAdminUserId - carries the HTTP status an API route should respond with. */
export class AdminAccessError extends Error {
  constructor(public readonly status: 401 | 403, message: string) {
    super(message);
  }
}

/**
 * Server-side gate for the admin ad-account-assignment feature: resolves
 * the logged-in user id and throws AdminAccessError unless that user's
 * isAdmin flag is set. Used by both app/admin/page.tsx (so the route itself
 * redirects/blocks non-admins, not just a hidden nav link) and every
 * /api/admin/* route handler (so the API can't be called directly by a
 * non-admin even if the page check were somehow bypassed).
 */
export async function requireAdminUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new AdminAccessError(401, "Log in first.");

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (!user?.isAdmin) throw new AdminAccessError(403, "Admins only.");

  return userId;
}
