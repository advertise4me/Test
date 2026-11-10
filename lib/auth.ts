import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ensureAdminFlag } from "@/lib/admin";

const BCRYPT_ROUNDS = 12;

export class AuthError extends Error {}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function signUp(email: string, password: string) {
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) throw new AuthError("Enter a valid email address.");
  if (password.length < 8) throw new AuthError("Password must be at least 8 characters.");

  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) throw new AuthError("An account with that email already exists.");

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({ data: { email: normalized, passwordHash } });
  await ensureAdminFlag(user.id, user.email);
  return user;
}

export async function logIn(email: string, password: string) {
  const normalized = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) throw new AuthError("Incorrect email or password.");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AuthError("Incorrect email or password.");

  // Idempotent - also self-heals isAdmin if this is the one agency-owner
  // email and the flag was never set (e.g. the account existed before this
  // field was added).
  await ensureAdminFlag(user.id, user.email);
  return user;
}
