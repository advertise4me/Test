export interface StepsSpec {
  title?: string;
  steps: string[];
}

export interface ConfirmActionSpendDetails {
  objectName: string;
  budget: string;
  dateRange: string;
}

export interface ConfirmAction {
  id: string;
  tool: string;
  summary: string;
  spendAffecting: boolean;
  spendDetails?: ConfirmActionSpendDetails;
}

export interface ParsedAssistantContent {
  text: string;
  suggestions?: string[];
  steps?: StepsSpec;
  confirmActions?: ConfirmAction[];
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

function isConfirmActionSpendDetails(value: unknown): value is ConfirmActionSpendDetails {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.objectName === "string" && typeof v.budget === "string" && typeof v.dateRange === "string";
}

function isConfirmAction(value: unknown): value is ConfirmAction {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.tool !== "string" || typeof v.summary !== "string") return false;
  if (typeof v.spendAffecting !== "boolean") return false;
  if (v.spendDetails !== undefined && !isConfirmActionSpendDetails(v.spendDetails)) return false;
  return true;
}

function isConfirmActionArray(value: unknown): value is ConfirmAction[] {
  return Array.isArray(value) && value.length > 0 && value.every(isConfirmAction);
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
  let confirmActions: ConfirmAction[] | undefined;

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

  const confirmActionsBlock = extractFencedBlock(text, "confirm_actions");
  if (confirmActionsBlock) {
    text = text.replace(confirmActionsBlock.raw, "");
    try {
      const parsed = JSON.parse(confirmActionsBlock.body);
      if (isConfirmActionArray(parsed)) {
        confirmActions = parsed;
      }
    } catch {
      // malformed - silently drop
    }
  }

  return { text: text.trim(), suggestions, steps, confirmActions };
}
