import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "@/lib/session";
import { startMetaAdsMcpSession } from "@/lib/mcp-client";

// See the claude-api skill for current model IDs - claude-opus-5 is the
// current default recommendation. Override with CLAUDE_MODEL if desired.
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";
const MAX_TOOL_ITERATIONS = 8;

const SYSTEM_PROMPT = `You are Ads Chat, an assistant that helps a marketer understand the performance \
of a single connected Meta (Facebook) ad account. You have tools to look up real campaigns, ad sets, \
ads, and insights (spend, impressions, clicks, CTR, CPC, CPM, reach, frequency, conversions, and ROAS) \
from that account. Always call a tool to get real numbers before answering performance questions - never \
guess or fabricate metrics. Cite concrete figures and the date range they cover. Keep answers concise and \
actionable; use short bullet points for lists of campaigns or metrics. If a tool call fails, explain the \
error in plain language and suggest what the user might check (e.g. token permissions, date range).`;

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

function isChatTurn(value: unknown): value is ChatTurn {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return (t.role === "user" || t.role === "assistant") && typeof t.content === "string";
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.metaAccessToken || !session.adAccountId) {
    return NextResponse.json(
      { error: "No Meta ad account is connected. Connect one first." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { message, history } = (body ?? {}) as { message?: unknown; history?: unknown };
  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "A message is required." }, { status: 400 });
  }
  const priorTurns: ChatTurn[] = Array.isArray(history) ? history.filter(isChatTurn) : [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }
  // Some organizations only issue org-wide API keys that aren't tied to a
  // specific workspace; Anthropic then requires the workspace id on every
  // request. Only needed if ANTHROPIC_API_KEY is that kind of key.
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  const anthropic = new Anthropic({
    apiKey,
    defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
  });

  let mcpSession: Awaited<ReturnType<typeof startMetaAdsMcpSession>>;
  try {
    mcpSession = await startMetaAdsMcpSession({
      accessToken: session.metaAccessToken,
      adAccountId: session.adAccountId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Could not start the Meta ads MCP server: ${(error as Error).message}` },
      { status: 500 },
    );
  }

  try {
    const messages: Anthropic.MessageParam[] = [
      ...priorTurns.map((t): Anthropic.MessageParam => ({ role: t.role, content: t.content })),
      { role: "user", content: message.trim() },
    ];

    let finalText = "";

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: mcpSession.tools,
        messages,
      });

      if (response.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: response.content });

        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
        );

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of toolUseBlocks) {
          try {
            const text = await mcpSession.callTool(
              block.name,
              (block.input ?? {}) as Record<string, unknown>,
            );
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: text });
          } catch (error) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              is_error: true,
              content: (error as Error).message,
            });
          }
        }

        messages.push({ role: "user", content: toolResults });
        continue;
      }

      finalText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n\n");
      break;
    }

    if (!finalText) {
      finalText =
        "I wasn't able to finish that within the allotted number of tool calls - try asking a more specific question.";
    }

    const updatedHistory: ChatTurn[] = [
      ...priorTurns,
      { role: "user", content: message.trim() },
      { role: "assistant", content: finalText },
    ];

    return NextResponse.json({ reply: finalText, history: updatedHistory });
  } catch (error) {
    console.error("chat error", error);
    const message =
      error instanceof Anthropic.APIError ? error.message : "Something went wrong talking to Claude.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await mcpSession.close();
  }
}
