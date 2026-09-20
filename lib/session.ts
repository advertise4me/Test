import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type IronSession } from "iron-session";

export interface AdsChatSessionData {
  metaAccessToken: string;
  adAccountId: string;
  accountName?: string;
  currency?: string;
  connectedAt: number;
}

const SESSION_COOKIE_NAME = "ads_chat_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

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
 * Reads/writes the encrypted, httpOnly session cookie that holds the connected
 * Meta ad account's credentials. This is the ONLY place those credentials are
 * persisted - there is no database and no server-side session store. The
 * cookie payload is encrypted and signed (AES-256-GCM via iron-session)
 * using SESSION_SECRET, so it cannot be read or forged by the client.
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
