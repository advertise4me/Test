import "server-only";
import { randomBytes, createHash } from "node:crypto";

// Shared helpers for the email-change and password-reset single-use tokens
// (see prisma/schema.prisma's EmailChangeToken / PasswordResetToken). Only
// the SHA-256 hash of the raw token is ever stored - the raw value exists
// only in the URL sent by email, same reasoning as a password hash: a
// database read (or backup leak) shouldn't hand out something usable.

export const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function tokenExpiryDate(): Date {
  return new Date(Date.now() + TOKEN_TTL_MS);
}
