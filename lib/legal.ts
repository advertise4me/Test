import "server-only";
import fs from "fs";
import path from "path";

// Legal content lives as versioned markdown files (not in the database) so
// a lawyer-reviewed replacement can later swap the file content without any
// code change - see content/legal/*.md. Each file has frontmatter (version,
// lastUpdated, draft, title) followed by a markdown body.

export type LegalSlug = "terms" | "disclaimer" | "privacy" | "licenses";

const LEGAL_FILES: Record<LegalSlug, string> = {
  terms: "terms-of-service.md",
  disclaimer: "ad-spend-disclaimer.md",
  privacy: "privacy-policy.md",
  licenses: "licenses.md",
};

export interface LegalDoc {
  slug: LegalSlug;
  title: string;
  version: string;
  lastUpdated: string;
  draft: boolean;
  body: string;
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const lineMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!lineMatch) continue;
    const [, key, rawValue] = lineMatch;
    meta[key] = rawValue.trim().replace(/^"(.*)"$/, "$1");
  }
  return { meta, body: match[2].trim() };
}

function readLegalDoc(slug: LegalSlug): LegalDoc {
  const filePath = path.join(process.cwd(), "content", "legal", LEGAL_FILES[slug]);
  const raw = fs.readFileSync(filePath, "utf-8");
  const { meta, body } = parseFrontmatter(raw);

  return {
    slug,
    title: meta.title ?? slug,
    version: meta.version ?? "unknown",
    lastUpdated: meta.lastUpdated ?? "unknown",
    draft: meta.draft === "true",
    body,
  };
}

/** Reads one legal document fresh from disk on every call - these are small files and change rarely. */
export function getLegalDoc(slug: LegalSlug): LegalDoc {
  return readLegalDoc(slug);
}

/**
 * The version string that gates the clickwrap and the version-change
 * re-acceptance check. The Terms of Service is the document of record for
 * this purpose - app/api/meta/confirm-action/route.ts and
 * app/api/legal/accept/route.ts both key off this same value.
 */
export function getCurrentTermsVersion(): string {
  return getLegalDoc("terms").version;
}
