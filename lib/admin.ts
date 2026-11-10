import "server-only";
import { prisma } from "@/lib/db";

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
