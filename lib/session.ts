import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type IronSession } from "iron-session";

// The cookie now only identifies the logged-in user - it no longer carries
// the Meta access token. That token lives encrypted in the MetaConnection
// table (see lib/crypto.ts / prisma/schema.prisma) and is looked up by
// userId on each request that needs it.
export interface AdsChatSessionData {
  userId?: string;
}

const SESSION_COOKIE_NAME = "ads_chat_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is not set (or is shorter than 32 characters). " +
        "Set it in .env.local - see .env.example.",
    );
  }
  return secret;
}

/**
 * Reads/writes the encrypted, httpOnly session cookie that identifies the
 * logged-in user. Encrypted and signed (AES-256-GCM via iron-session) using
 * SESSION_SECRET, so it cannot be read or forged by the client.
 */
export async function getSession(): Promise<IronSession<AdsChatSessionData>> {
  const cookieStore = await cookies();
  return getIronSession<AdsChatSessionData>(cookieStore, {
    cookieName: SESSION_COOKIE_NAME,
    password: getSessionSecret(),
    ttl: SESSION_TTL_SECONDS,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  });
}

/** Convenience helper for API routes: the logged-in user's id, or null. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session.userId ?? null;
}
