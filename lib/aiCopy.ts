import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { DashboardData } from "@/lib/kpiConfig";
import type { PeriodKey } from "@/lib/period";
import { PERIOD_OPTIONS } from "@/lib/period";

// AI copy for the AI Summary tab's "What this means" card and "What to do
// next" card. Reuses the same Anthropic client setup as app/api/chat/route.ts
// (same env vars, same org-workspace-header handling).
//
// Caching: deliberately NOT persisted. This phase regenerates the copy on
// every request instead of caching it per user+period+data-hash in Postgres.
// The KPI numbers themselves are already cheap to recompute, the inputs to
// this call are small, and a dashboard tab that's pulled-to-refresh wants
// fresh copy anyway - a persistent cache would mostly save one cheap Claude
// call per page load at the cost of a cache table, invalidation logic, and a
// hash of "the underlying numbers" that's easy to get subtly wrong. If this
// tab's traffic or cost profile changes later, add a DashboardSummaryCache
// model (userId + period + dataHash -> copy) and check it before calling
// Claude, exactly the shape described in the task.

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";

const BANNED_BUDGET_PHRASES = [
  "raise the budget",
  "raise your budget",
  "increase the budget",
  "increase your budget",
  "more budget",
  "spend more",
  "scale up budget",
  "scale the budget",
  "bigger budget",
  "higher budget",
];

const FALLBACK_NEXT_STEPS: Record<string, { text: string; prefill: string }[]> = {
  attention: [
    { text: "Check your top ad for a result before changing anything else", prefill: "Which of my ads is performing the worst right now, and why?" },
    { text: "Make sure the right tracking is still connected", prefill: "Can you check if my pixel or tracking is set up correctly?" },
    { text: "Give campaigns a few more days before judging them", prefill: "How long should I wait before deciding if a campaign isn't working?" },
  ],
  learning: [
    { text: "Let your campaigns finish learning before judging results", prefill: "What does it mean that my campaign is still in the learning phase?" },
    { text: "Avoid pausing or editing active ads for now", prefill: "Why shouldn't I edit my ads while they're still learning?" },
    { text: "Check back in a few days for a clearer picture", prefill: "What should I look at once my campaigns are out of the learning phase?" },
  ],
  default: [
    { text: "Test a new version of your top-performing ad", prefill: "Help me test a new version of my top ad" },
    { text: "Review which audience is responding best", prefill: "Which audience is performing best for me right now?" },
    { text: "Refresh the creative on your lowest performer", prefill: "Help me come up with a new creative idea for my worst-performing ad" },
  ],
};

function containsBannedBudgetPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_BUDGET_PHRASES.some((phrase) => lower.includes(phrase));
}

export interface NextStep {
  text: string;
  prefill: string;
}

export interface SummaryCopy {
  whatThisMeans: string;
  nextSteps: NextStep[];
}

function periodLabel(period: PeriodKey): string {
  return PERIOD_OPTIONS.find((opt) => opt.key === period)?.label ?? period;
}

function fallbackCopy(data: DashboardData, learningPhase: boolean): SummaryCopy {
  const pool = data.status.level === "attention" ? FALLBACK_NEXT_STEPS.attention : learningPhase ? FALLBACK_NEXT_STEPS.learning : FALLBACK_NEXT_STEPS.default;
  const whatThisMeans =
    data.status.level === "attention"
      ? `${data.status.detail} That's below where we'd like it to be, so it's worth a closer look before doing anything else.`
      : data.status.level === "watch"
        ? `${data.status.detail} That's a reasonable result - keep watching it over the next few days.`
        : `${data.status.detail} That's a solid result for this period - nice work.`;
  return { whatThisMeans, nextSteps: pool };
}

function buildPrompt(data: DashboardData, period: PeriodKey, learningPhase: boolean, guardrailNote: string): string {
  const kpiLines = data.kpis
    .map((k) => `- ${k.label}: ${k.value}${k.change ? ` (${k.change.direction === "up" ? "up" : "down"} ${k.change.percent.toFixed(0)}% vs the previous period, which is ${k.change.isGood ? "good" : "not great"})` : ""}`)
    .join("\n");
  const funnelLines = data.funnel.steps.map((s) => `- ${s.label}: ${s.displayValue}`).join("\n");

  return `Business type: ${data.businessType}
Period: ${periodLabel(period)}
Status: ${data.status.level} (${data.status.headline})
Status detail: ${data.status.detail}
Still in Meta's learning phase: ${learningPhase ? "yes" : "no"}

KPIs this period:
${kpiLines}

Funnel this period:
${funnelLines || "(no funnel data available)"}

${guardrailNote}

Respond with ONLY a single JSON object, no prose before or after, no markdown code fences, matching exactly this shape:
{"whatThisMeans": "1-2 plain sentences", "nextSteps": [{"text": "short action line", "prefill": "a chat message the user could send to act on it"}, {"text": "...", "prefill": "..."}, {"text": "...", "prefill": "..."}]}
nextSteps must have exactly 3 entries.`;
}

const SYSTEM_PROMPT = `You write the "What this means" and "What to do next" copy for a small business owner's ad performance dashboard. Use ONLY plain, everyday language - never use marketing jargon or acronyms like CTR, CPM, CPC, CPA, ROAS, or "attribution window". Say things like "people clicked", "cost per sale", "how many people reached out" instead. Be encouraging but honest: if results are poor, say so kindly and point to one concrete next step - never fake positivity or claim something is working when it isn't. Keep "whatThisMeans" to 1-2 short sentences. Keep each of the 3 "nextSteps" text fields to one short, concrete action line (under 12 words). Each "prefill" should be a first-person chat message the user could send to an ads assistant to act on that step.`;

/**
 * Generates the AI Summary tab's copy via Claude, with a guardrail pass
 * that strips any recommendation to raise spend while the account is in
 * "needs attention" status or still in Meta's learning phase, and a
 * deterministic fallback if the API call fails or returns something we
 * can't parse (missing key, network error, malformed JSON, etc).
 */
export async function generateSummaryCopy(data: DashboardData, period: PeriodKey, learningPhase: boolean): Promise<SummaryCopy> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackCopy(data, learningPhase);

  const blockBudgetIncrease = data.status.level === "attention" || learningPhase;
  const guardrailNote = blockBudgetIncrease
    ? "IMPORTANT: Do not recommend raising or increasing the budget anywhere in nextSteps - status is needs-attention or still learning, so suggest something else (checking tracking, refreshing creative, waiting for the learning phase to finish, fixing the offer/landing page, etc)."
    : "";

  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  const anthropic = new Anthropic({ apiKey, defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined });

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(data, period, learningPhase, guardrailNote) }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    const jsonText = text.startsWith("```") ? text.replace(/^```(?:json)?\n?/, "").replace(/```$/, "") : text;
    const parsed = JSON.parse(jsonText) as { whatThisMeans?: unknown; nextSteps?: unknown };

    if (typeof parsed.whatThisMeans !== "string" || !Array.isArray(parsed.nextSteps)) {
      return fallbackCopy(data, learningPhase);
    }

    const fallbackPool = data.status.level === "attention" ? FALLBACK_NEXT_STEPS.attention : learningPhase ? FALLBACK_NEXT_STEPS.learning : FALLBACK_NEXT_STEPS.default;

    const nextSteps: NextStep[] = parsed.nextSteps
      .filter((entry): entry is { text: string; prefill: string } => !!entry && typeof (entry as Record<string, unknown>).text === "string" && typeof (entry as Record<string, unknown>).prefill === "string")
      .map((entry, i) => {
        if (blockBudgetIncrease && containsBannedBudgetPhrase(entry.text)) {
          return fallbackPool[i] ?? fallbackPool[0];
        }
        return entry;
      })
      .slice(0, 3);

    while (nextSteps.length < 3) nextSteps.push(fallbackPool[nextSteps.length] ?? fallbackPool[0]);

    return { whatThisMeans: parsed.whatThisMeans, nextSteps };
  } catch {
    return fallbackCopy(data, learningPhase);
  }
}
