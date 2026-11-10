import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { resolveUserAdAccount } from "@/lib/adAccountAccess";
import { startMetaAdsMcpSession } from "@/lib/mcp-client";
import { consumePendingAction, discardPendingAction, getPendingAction } from "@/lib/pendingActions";
import { WRITE_TOOL_NAMES, enforceExecutionInvariants, type SpendDetails } from "@/lib/metaWriteGate";
import { getCurrentTermsVersion } from "@/lib/legal";

// The only place in this app that is allowed to actually call a Meta write
// tool. app/api/chat/route.ts never calls one directly - it only ever
// stores a pending action and hands the id back to the UI. This route:
//   1. trusts nothing from the client except the pending action's id,
//   2. re-checks the action belongs to the logged-in user's own session,
//   3. re-applies the PAUSED / no-activate invariants itself, in code,
//      instead of trusting whatever was sanitized when the action was
//      proposed, and
//   4. only then talks to Meta, through the same MCP session the chat
//      route uses - so a confirmed action goes through the exact same
//      code path (and any future rate limiting on that path) as a normal
//      chat turn, not a shortcut around it.

function extractResultId(resultText: string): string | undefined {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(resultText);
  } catch {
    // Not JSON.
  }
  return parsed && typeof parsed === "object" && typeof (parsed as Record<string, unknown>).id === "string"
    ? ((parsed as Record<string, unknown>).id as string)
    : undefined;
}

function buildSuccessDetail(tool: string, input: Record<string, unknown>, resultText: string): string {
  const id = extractResultId(resultText);
  const idSuffix = id ? ` (id: ${id})` : "";

  switch (tool) {
    case "create_campaign":
      return `Created campaign "${String(input.name)}"${idSuffix}, status: PAUSED.`;
    case "create_ad_set":
      return `Created ad set "${String(input.name)}"${idSuffix}, status: PAUSED.`;
    case "create_ad_creative":
      return `Created ad creative${idSuffix}.`;
    case "create_ad":
      return `Created ad "${String(input.name)}"${idSuffix}, status: PAUSED.`;
    case "update_campaign":
      return `Updated campaign ${String(input.campaign_id)}.`;
    case "update_ad_set":
      return `Updated ad set ${String(input.ad_set_id)}.`;
    case "update_ad_status":
      return `Updated ad ${String(input.ad_id)}.`;
    default:
      return "Done.";
  }
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

  const { id, decision } = (body ?? {}) as { id?: unknown; decision?: unknown };
  if (typeof id !== "string" || id.length === 0 || (decision !== "confirm" && decision !== "cancel")) {
    return NextResponse.json({ error: 'id and decision ("confirm" or "cancel") are required.' }, { status: 400 });
  }

  if (decision === "cancel") {
    // Discard unconditionally (including if it belongs to someone else, or
    // is already gone) - a cancel never needs to reveal anything and never
    // calls Meta either way.
    discardPendingAction(id);
    return NextResponse.json({ status: "cancelled" });
  }

  // Check ownership before consuming - a mismatched request must not be able
  // to destroy the real owner's still-pending action.
  const peeked = getPendingAction(id);
  if (!peeked) {
    return NextResponse.json(
      { error: "This action has expired or was already handled - please ask again in the chat." },
      { status: 410 },
    );
  }
  if (peeked.userId !== userId) {
    return NextResponse.json({ error: "This action does not belong to your session." }, { status: 403 });
  }

  const action = consumePendingAction(id);
  if (!action) {
    // Expired in the gap between the peek above and this consume.
    return NextResponse.json(
      { error: "This action has expired or was already handled - please ask again in the chat." },
      { status: 410 },
    );
  }
  if (!WRITE_TOOL_NAMES.has(action.tool)) {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  let enforcedInput: Record<string, unknown>;
  try {
    enforcedInput = enforceExecutionInvariants(action.tool, action.input);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  let account: Awaited<ReturnType<typeof resolveUserAdAccount>>;
  try {
    account = await resolveUserAdAccount(userId);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  if (!account) {
    return NextResponse.json(
      { error: "No ad account has been assigned to you yet. Ask the agency to assign one to your login." },
      { status: 403 },
    );
  }

  let mcpSession: Awaited<ReturnType<typeof startMetaAdsMcpSession>>;
  try {
    mcpSession = await startMetaAdsMcpSession({
      accessToken: account.accessToken,
      adAccountId: account.adAccountId,
      // See the matching note in app/api/chat/route.ts - Page resolution
      // isn't wired up yet under the shared-token model.
      pageId: undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Could not start the Meta ads MCP server: ${(error as Error).message}` },
      { status: 500 },
    );
  }

  try {
    const text = await mcpSession.callTool(action.tool, enforcedInput);
    if (text.startsWith("Error:")) {
      const errorMessage = text.replace(/^Error:\s*/, "");
      await logWriteAction(userId, action.tool, action.summary, enforcedInput, "error", errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }

    const detail = buildSuccessDetail(action.tool, enforcedInput, text);
    await logWriteAction(userId, action.tool, action.summary, enforcedInput, "success", text);
    if (action.spendAffecting) {
      await logSpendApproval(userId, action.tool, enforcedInput, text, action.spendDetails);
    }
    return NextResponse.json({ status: "confirmed", detail });
  } catch (error) {
    const message = (error as Error).message || "Something went wrong talking to Meta.";
    await logWriteAction(userId, action.tool, action.summary, enforcedInput, "error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await mcpSession.close();
  }
}

/**
 * Records one row in ad_action_approvals for a spendAffecting action that
 * just succeeded against the real Meta API - additive to logWriteAction
 * below, not a replacement for it. termsVersion is the real current Terms
 * of Service version (Phase 5b), not the old "v0-draft" placeholder.
 * Best-effort: never let a logging failure affect the response the user sees.
 */
async function logSpendApproval(
  userId: string,
  tool: string,
  input: Record<string, unknown>,
  resultText: string,
  spendDetails: SpendDetails | undefined,
): Promise<void> {
  try {
    const objectId =
      extractResultId(resultText) ??
      (typeof input.campaign_id === "string" ? input.campaign_id : undefined) ??
      (typeof input.ad_set_id === "string" ? input.ad_set_id : undefined);
    await prisma.adActionApproval.create({
      data: {
        userId,
        tool,
        objectId,
        budget: spendDetails?.budget,
        termsVersion: getCurrentTermsVersion(),
      },
    });
  } catch (error) {
    console.error("failed to write ad_action_approvals row", error);
  }
}

/** Best-effort audit trail - never let a logging failure affect the response the user sees. */
async function logWriteAction(
  userId: string,
  tool: string,
  summary: string,
  input: Record<string, unknown>,
  status: "success" | "error",
  result: string,
): Promise<void> {
  try {
    await prisma.writeActionLog.create({
      data: { userId, tool, summary, input: JSON.stringify(input), status, result },
    });
  } catch (error) {
    console.error("failed to write audit log entry", error);
  }
}
