import "server-only";

// Everything about *which* Meta tools can spend real money and *how* a
// proposed call is summarized / locked down before it ever reaches the
// Graph API. Used by app/api/chat/route.ts (to intercept a write-tool call
// and build the confirmation card) and app/api/meta/confirm-action/route.ts
// (to re-apply the same invariants, hardcoded, right before the API call -
// see enforceExecutionInvariants).

/** The 7 tools in mcp-server/index.ts that create or edit something on Meta. Everything else (get_ad_account, list_campaigns, list_ad_sets, list_ads, get_insights) is read-only and executes immediately, unchanged. */
export const WRITE_TOOL_NAMES = new Set([
  "create_campaign",
  "create_ad_set",
  "create_ad_creative",
  "create_ad",
  "update_campaign",
  "update_ad_set",
  "update_ad_status",
]);

export function isWriteTool(name: string): boolean {
  return WRITE_TOOL_NAMES.has(name);
}

type Input = Record<string, unknown>;

export type PrepareWriteActionResult =
  | { ok: true; sanitizedInput: Input; summary: string }
  | { ok: false; reason: string };

function formatMoney(amount: unknown, currency?: string): string | null {
  if (typeof amount !== "number") return null;
  const value = (amount / 100).toFixed(2);
  return currency ? `${value} ${currency}` : value;
}

function budgetPhrase(input: Input, currency?: string): string | null {
  const daily = formatMoney(input.daily_budget, currency);
  if (daily) return `${daily}/day`;
  const lifetime = formatMoney(input.lifetime_budget, currency);
  if (lifetime) return `${lifetime} lifetime`;
  return null;
}

/**
 * Builds a human-readable summary of a proposed write-tool call, and a
 * sanitized copy of its input with the "create = always PAUSED" and "no
 * activating through this flow" rules already applied - or, if the call
 * can't go through this flow at all (e.g. it's only a request to set status
 * ACTIVE), a reason to hand back to the model instead of a pending action.
 *
 * This only decides what *would* happen - it never calls Meta.
 * enforceExecutionInvariants below is what actually re-applies the PAUSED /
 * no-activate rules at execution time, independent of what's stored here.
 */
export function prepareWriteAction(tool: string, input: Input, currency?: string): PrepareWriteActionResult {
  switch (tool) {
    case "create_campaign": {
      const budget = budgetPhrase(input, currency) ?? "no budget set here (ad sets will set their own)";
      return {
        ok: true,
        sanitizedInput: { ...input, status: "PAUSED" },
        summary: `Create new campaign "${String(input.name)}" — objective: ${String(input.objective)}, ${budget}, status: PAUSED`,
      };
    }

    case "create_ad_set": {
      const budget = budgetPhrase(input, currency) ?? "no budget set here (using the campaign's budget)";
      const targetingParts: string[] = [];
      if (Array.isArray(input.countries) && input.countries.length) {
        targetingParts.push(`countries: ${input.countries.join(", ")}`);
      }
      if (Array.isArray(input.custom_locations) && input.custom_locations.length) {
        targetingParts.push(`${input.custom_locations.length} custom location${input.custom_locations.length === 1 ? "" : "s"}`);
      }
      if (typeof input.age_min === "number" || typeof input.age_max === "number") {
        targetingParts.push(`ages ${input.age_min ?? 13}-${input.age_max ?? 65}`);
      }
      if (Array.isArray(input.genders) && input.genders.length) {
        targetingParts.push(`genders: ${input.genders.map((g) => (g === 1 ? "male" : "female")).join(", ")}`);
      }
      const targeting = targetingParts.length ? targetingParts.join(", ") : "no targeting restrictions (everyone)";
      return {
        ok: true,
        sanitizedInput: { ...input, status: "PAUSED" },
        summary: `Create new ad set "${String(input.name)}" in campaign ${String(input.campaign_id)} — goal: ${String(input.optimization_goal)}, ${targeting}, ${budget}, status: PAUSED`,
      };
    }

    case "create_ad_creative": {
      const media = input.video_id ? `video ${String(input.video_id)}` : `image ${String(input.image_hash)}`;
      const cta = input.call_to_action ? `, button: ${String(input.call_to_action)}` : "";
      return {
        ok: true,
        sanitizedInput: { ...input },
        summary:
          `Create ad creative using ${media} — headline: "${input.headline ? String(input.headline) : "(none)"}", ` +
          `text: "${String(input.message)}", link: ${String(input.link)}${cta}`,
      };
    }

    case "create_ad": {
      return {
        ok: true,
        sanitizedInput: { ...input, status: "PAUSED" },
        summary: `Create new ad "${String(input.name)}" in ad set ${String(input.ad_set_id)} using creative ${String(input.creative_id)}, status: PAUSED`,
      };
    }

    case "update_campaign":
    case "update_ad_set": {
      const isCampaign = tool === "update_campaign";
      const idField = isCampaign ? "campaign_id" : "ad_set_id";
      const label = isCampaign ? "campaign" : "ad set";
      const sanitized: Input = { ...input };
      const requestedActive = sanitized.status === "ACTIVE";
      if (requestedActive) delete sanitized.status;

      const parts: string[] = [];
      if (sanitized.status === "PAUSED") parts.push("pause it");
      const daily = formatMoney(sanitized.daily_budget, currency);
      if (daily) parts.push(`set the daily budget to ${daily}`);
      const lifetime = formatMoney(sanitized.lifetime_budget, currency);
      if (lifetime) parts.push(`set the lifetime budget to ${lifetime}`);

      if (parts.length === 0) {
        return {
          ok: false,
          reason: requestedActive
            ? "Resuming (setting status to ACTIVE) isn't supported through this confirmation flow for safety - only pausing and budget changes can be confirmed here. Tell the user this needs to be done directly in Meta Ads Manager for now."
            : "There's nothing left to confirm for this update.",
        };
      }

      const note = requestedActive
        ? " (note: the requested change to ACTIVE was dropped - resuming isn't supported through this confirmation flow)"
        : "";
      return {
        ok: true,
        sanitizedInput: sanitized,
        summary: `Update ${label} ${String(input[idField])}: ${parts.join(", ")}${note}`,
      };
    }

    case "update_ad_status": {
      if (input.status === "ACTIVE") {
        return {
          ok: false,
          reason:
            "Resuming an ad (setting status to ACTIVE) isn't supported through this confirmation flow for safety - " +
            "only pausing is supported here. Tell the user this needs to be done directly in Meta Ads Manager for now.",
        };
      }
      return {
        ok: true,
        sanitizedInput: { ...input },
        summary: `Pause ad ${String(input.ad_id)}`,
      };
    }

    default:
      return { ok: false, reason: `"${tool}" is not a recognized write action.` };
  }
}

/**
 * The hard, non-optional invariants, re-applied right at the point of
 * execution (app/api/meta/confirm-action/route.ts) instead of trusting
 * whatever was sanitized and stored earlier:
 *  - create_campaign / create_ad_set / create_ad always execute with
 *    status forced to PAUSED, no matter what was proposed or stored.
 *  - update_campaign / update_ad_set never activate anything through this
 *    flow - an ACTIVE status is stripped rather than sent.
 *  - update_ad_status rejects ACTIVE outright (its only purpose besides
 *    pausing is resuming, so there's nothing left to strip it down to).
 * Throws for the one case (update_ad_status + ACTIVE) that has no safe
 * partial action to fall back to - prepareWriteAction above already
 * refuses to create a pending action for that case, so this is defense in
 * depth, not the primary check.
 */
export function enforceExecutionInvariants(tool: string, input: Input): Input {
  const result: Input = { ...input };

  if (tool === "create_campaign" || tool === "create_ad_set" || tool === "create_ad") {
    result.status = "PAUSED";
  }

  if ((tool === "update_campaign" || tool === "update_ad_set") && result.status === "ACTIVE") {
    delete result.status;
  }

  if (tool === "update_ad_status" && result.status === "ACTIVE") {
    throw new Error("Refusing to resume (status ACTIVE) through the confirmation flow.");
  }

  return result;
}
