import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";

const LANGUAGES = new Set(["en", "es"]);

function cleanString(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined; // field not sent - leave unchanged
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, maxLength);
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { fullName, businessName, businessWebsite, language } = (body ?? {}) as Record<string, unknown>;

  if (language !== undefined && (typeof language !== "string" || !LANGUAGES.has(language))) {
    return NextResponse.json({ error: 'Language must be "en" or "es".' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  const fullNameClean = cleanString(fullName, 120);
  const businessNameClean = cleanString(businessName, 120);
  const businessWebsiteClean = cleanString(businessWebsite, 200);
  if (fullNameClean !== undefined) data.fullName = fullNameClean;
  if (businessNameClean !== undefined) data.businessName = businessNameClean;
  if (businessWebsiteClean !== undefined) data.businessWebsite = businessWebsiteClean;
  if (typeof language === "string") data.language = language;

  const user = await prisma.user.update({ where: { id: userId }, data });

  return NextResponse.json({
    ok: true,
    profile: {
      fullName: user.fullName,
      businessName: user.businessName,
      businessWebsite: user.businessWebsite,
      language: user.language,
    },
  });
}
