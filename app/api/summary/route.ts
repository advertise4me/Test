import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { resolveUserAdAccount } from "@/lib/adAccountAccess";
import { MetaApiError, getInsights, listAdSets, listCampaigns } from "@/mcp-server/meta-client";
import { getDetectionRange, getPeriodRange, isPeriodKey, type PeriodKey } from "@/lib/period";
import {
  aggregateInsights,
  buildDashboardData,
  detectBusinessType,
  type BusinessType,
} from "@/lib/kpiConfig";
import { generateSummaryCopy } from "@/lib/aiCopy";
import type { SummaryResponse } from "@/lib/summaryTypes";
import { sendMetaAccessLostAlert, sendNeedsAttentionAlert } from "@/lib/emailTemplates";

const LEARNING_STATUSES = new Set(["LEARNING", "LEARNING_LIMITED"]);
const ALERT_THROTTLE_MS = 24 * 60 * 60 * 1000; // don't re-send either alert more than once a day

function isTokenError(error: unknown): boolean {
  return error instanceof MetaApiError && (error.code === 190 || error.type === "OAuthException");
}

function dueForAlert(lastSentAt: Date | null): boolean {
  return !lastSentAt || Date.now() - lastSentAt.getTime() > ALERT_THROTTLE_MS;
}

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  const periodParam = req.nextUrl.searchParams.get("period");
  const period: PeriodKey = isPeriodKey(periodParam) ? periodParam : "this_week";

  let account: Awaited<ReturnType<typeof resolveUserAdAccount>>;
  try {
    account = await resolveUserAdAccount(userId);
  } catch (error) {
    console.error("summary: could not resolve Meta system user token", error);
    return NextResponse.json(
      { state: "error", message: (error as Error).message } satisfies SummaryResponse,
      { status: 500 },
    );
  }
  if (!account) {
    return NextResponse.json({ state: "no_account_assigned" } satisfies SummaryResponse);
  }

  const config = { accessToken: account.accessToken, adAccountId: account.adAccountId };
  // AdAccountAssignment doesn't cache a currency (only adAccountId/Name - see
  // AGENTS.md Phase A) - default to USD. DashboardConfig still caches
  // whatever currency was in play the first time it was detected, same as
  // before.
  const currency = "USD";

  try {
    const dashboardConfig = (await prisma.dashboardConfig.findUnique({ where: { userId } })) ?? (await detectAndPersist(userId, config, currency));

    const businessType = dashboardConfig.businessType as BusinessType;

    const { current: currentRange, previous: previousRange } = getPeriodRange(period);

    const [currentInsights, previousInsights, adSets] = await Promise.all([
      getInsights(config, { level: "account", since: currentRange.since, until: currentRange.until }),
      getInsights(config, { level: "account", since: previousRange.since, until: previousRange.until }),
      listAdSets(config, { limit: 200 }).catch(() => ({ data: [] })),
    ]);

    const currentSummary = aggregateInsights(currentInsights.data);
    const previousSummary = aggregateInsights(previousInsights.data);

    if (currentSummary.spend === 0 && currentSummary.impressions === 0) {
      return NextResponse.json({ state: "no_spend", period } satisfies SummaryResponse);
    }

    const learningPhase = adSets.data.some((adset) => {
      const info = (adset as Record<string, unknown>).learning_stage_info as Record<string, unknown> | undefined;
      const status = info?.status;
      return typeof status === "string" && LEARNING_STATUSES.has(status);
    });

    const data = buildDashboardData(businessType, currentSummary, previousSummary, currency, dashboardConfig.targetValue, learningPhase);
    const copy = await generateSummaryCopy(data, period, learningPhase);

    await markSyncOk(userId);
    // Only the default/current-week load drives the alert, so switching the
    // period selector to look at older data never triggers it.
    if (period === "this_week" && data.status.level === "attention") {
      await maybeSendAttentionAlert(userId, data.status, req);
    }

    return NextResponse.json({
      state: "ok",
      period,
      currency,
      businessType,
      learningPhase,
      status: data.status,
      kpis: data.kpis,
      funnel: data.funnel,
      whatThisMeans: copy.whatThisMeans,
      nextSteps: copy.nextSteps,
    } satisfies SummaryResponse);
  } catch (error) {
    if (isTokenError(error)) {
      await markSyncErrorAndMaybeAlert(userId, req);
      return NextResponse.json({ state: "token_expired" } satisfies SummaryResponse);
    }
    console.error("summary error", error);
    const message = error instanceof MetaApiError ? error.message : "Something went wrong loading your summary.";
    return NextResponse.json({ state: "error", message } satisfies SummaryResponse, { status: 500 });
  }
}

/**
 * Best-effort: records that the latest summary load succeeded against Meta -
 * drives Settings 6.3's status dot / "last sync" time. Only meaningful for
 * users who still have an old-flow MetaConnection row (updateMany is a
 * no-op, not an error, for anyone resolved through AdAccountAssignment
 * instead - see AGENTS.md Phase A).
 */
async function markSyncOk(userId: string): Promise<void> {
  try {
    await prisma.metaConnection.updateMany({
      where: { userId },
      data: { lastSyncAt: new Date(), lastSyncStatus: "ok" },
    });
  } catch (error) {
    console.error("failed to record successful sync", error);
  }
}

/** Best-effort: records the token failure, and emails the user once (throttled) that Meta access was lost - Settings 6.5. */
async function markSyncErrorAndMaybeAlert(userId: string, req: NextRequest): Promise<void> {
  try {
    const connection = await prisma.metaConnection.findUnique({ where: { userId } });
    if (!connection) return;
    await prisma.metaConnection.update({ where: { userId }, data: { lastSyncStatus: "error" } });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, notifyMetaAccessLost: true } });
    if (!user || !user.notifyMetaAccessLost) return;
    if (!dueForAlert(connection.lastAccessLostAlertAt)) return;

    const reconnectUrl = `${req.nextUrl.origin}/settings`;
    await sendMetaAccessLostAlert(user.email, reconnectUrl);
    await prisma.metaConnection.update({ where: { userId }, data: { lastAccessLostAlertAt: new Date() } });
  } catch (error) {
    console.error("failed to send meta-access-lost alert", error);
  }
}

/** Best-effort: emails the user once (throttled) that their account status is "needs attention" - Settings 6.5. */
async function maybeSendAttentionAlert(
  userId: string,
  status: { headline: string; detail: string },
  req: NextRequest,
): Promise<void> {
  try {
    const [user, dashboardConfig] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { email: true, notifyNeedsAttention: true } }),
      prisma.dashboardConfig.findUnique({ where: { userId } }),
    ]);
    if (!user || !user.notifyNeedsAttention || !dashboardConfig) return;
    if (!dueForAlert(dashboardConfig.lastAttentionAlertAt)) return;

    const appUrl = `${req.nextUrl.origin}/summary`;
    await sendNeedsAttentionAlert(user.email, { headline: status.headline, detail: status.detail, appUrl });
    await prisma.dashboardConfig.update({ where: { userId }, data: { lastAttentionAlertAt: new Date() } });
  } catch (error) {
    console.error("failed to send needs-attention alert", error);
  }
}

/**
 * First-load-only business-type detection: a wide 90-day lookback across
 * campaign objectives and conversion action types, persisted so later
 * requests (and later period changes) don't re-detect - and so Settings
 * (Phase 5) has a stable value to let the user override.
 */
async function detectAndPersist(
  userId: string,
  config: { accessToken: string; adAccountId: string },
  currency: string,
) {
  const detectionRange = getDetectionRange();
  const [campaigns, insights] = await Promise.all([
    listCampaigns(config, { limit: 200 }),
    getInsights(config, { level: "account", since: detectionRange.since, until: detectionRange.until }),
  ]);

  const objectives = campaigns.data
    .map((c) => (c as Record<string, unknown>).objective)
    .filter((o): o is string => typeof o === "string");
  const summary = aggregateInsights(insights.data);
  const businessType = detectBusinessType(objectives, summary.actions);

  return prisma.dashboardConfig.upsert({
    where: { userId },
    create: { userId, businessType, currency },
    update: { businessType, currency },
  });
}
