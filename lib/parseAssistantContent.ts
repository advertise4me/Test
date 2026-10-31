export interface StepsSpec {
  title?: string;
  steps: string[];
}

export interface ParsedAssistantContent {
  text: string;
  suggestions?: string[];
  steps?: StepsSpec;
}

function extractFencedBlock(source: string, language: string): { raw: string; body: string } | null {
  const pattern = new RegExp("```" + language + "\\n([\\s\\S]*?)```", "i");
  const match = source.match(pattern);
  if (!match) return null;
  return { raw: match[0], body: match[1].trim() };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isStepsSpec(value: unknown): value is StepsSpec {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.title !== undefined && typeof v.title !== "string") return false;
  return isStringArray(v.steps) && v.steps.length > 0;
}

/**
 * Pulls the ```suggestions and ```steps fenced JSON blocks (per the chat
 * system prompt's convention) out of a raw assistant message, returning the
 * remaining prose plus whatever parsed cleanly. Malformed blocks are
 * dropped silently rather than surfaced as errors.
 */
export function parseAssistantContent(raw: string): ParsedAssistantContent {
  let text = raw;
  let suggestions: string[] | undefined;
  let steps: StepsSpec | undefined;

  const suggestionsBlock = extractFencedBlock(text, "suggestions");
  if (suggestionsBlock) {
    text = text.replace(suggestionsBlock.raw, "");
    try {
      const parsed = JSON.parse(suggestionsBlock.body);
      if (isStringArray(parsed) && parsed.length > 0) {
        suggestions = parsed.slice(0, 3);
      }
    } catch {
      // malformed - silently drop
    }
  }

  const stepsBlock = extractFencedBlock(text, "steps");
  if (stepsBlock) {
    text = text.replace(stepsBlock.raw, "");
    try {
      const parsed = JSON.parse(stepsBlock.body);
      if (isStepsSpec(parsed)) {
        steps = parsed;
      }
    } catch {
      // malformed - silently drop
    }
  }

  return { text: text.trim(), suggestions, steps };
}
