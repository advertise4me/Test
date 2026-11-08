import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/crypto";
import { MetaApiError, getInsights, listAdSets, listCampaigns, normalizeAdAccountId } from "@/mcp-server/meta-client";
import { getDetectionRange, getPeriodRange, isPeriodKey, type PeriodKey } from "@/lib/period";
import {
  aggregateInsights,
  buildDashboardData,
  detectBusinessType,
  type BusinessType,
} from "@/lib/kpiConfig";
import { generateSummaryCopy } from "@/lib/aiCopy";
import type { SummaryResponse } from "@/lib/summaryTypes";

const LEARNING_STATUSES = new Set(["LEARNING", "LEARNING_LIMITED"]);

function isTokenError(error: unknown): boolean {
  return error instanceof MetaApiError && (error.code === 190 || error.type === "OAuthException");
}

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  const periodParam = req.nextUrl.searchParams.get("period");
  const period: PeriodKey = isPeriodKey(periodParam) ? periodParam : "this_week";

  const connection = await prisma.metaConnection.findUnique({ where: { userId } });
  if (!connection) {
    return NextResponse.json({ state: "no_connection" } satisfies SummaryResponse);
  }

  const config = { accessToken: decryptToken(connection.accessTokenCiphertext), adAccountId: normalizeAdAccountId(connection.adAccountId) };
  const currency = connection.currency ?? "USD";

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
      return NextResponse.json({ state: "token_expired" } satisfies SummaryResponse);
    }
    console.error("summary error", error);
    const message = error instanceof MetaApiError ? error.message : "Something went wrong loading your summary.";
    return NextResponse.json({ state: "error", message } satisfies SummaryResponse, { status: 500 });
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
