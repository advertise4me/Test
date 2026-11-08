import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { BUSINESS_TYPE_LABELS, primaryKpiKeyForType, primaryKpiLabelForType, type BusinessType } from "@/lib/kpiConfig";

const VALID_TYPES = new Set(Object.keys(BUSINESS_TYPE_LABELS));

// Overrides the auto-detected business type / target KPI value (Settings
// 6.1). This is the one place Settings writes straight into DashboardConfig
// - the same row app/api/summary/route.ts reads to decide which KPI tiles,
// funnel, and status thresholds to show, so saving here actually changes
// the AI Summary tab, not just a cosmetic field.
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

  const { businessType, targetValue } = (body ?? {}) as Record<string, unknown>;

  if (typeof businessType !== "string" || !VALID_TYPES.has(businessType)) {
    return NextResponse.json({ error: "Choose a valid business type." }, { status: 400 });
  }

  let cleanTargetValue: number | null = null;
  if (targetValue !== null && targetValue !== undefined && targetValue !== "") {
    const parsed = typeof targetValue === "number" ? targetValue : Number(targetValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return NextResponse.json({ error: "Target value must be a positive number." }, { status: 400 });
    }
    cleanTargetValue = parsed;
  }

  const type = businessType as BusinessType;
  const dashboardConfig = await prisma.dashboardConfig.upsert({
    where: { userId },
    create: { userId, businessType: type, primaryKpi: primaryKpiKeyForType(type), targetValue: cleanTargetValue },
    update: { businessType: type, primaryKpi: primaryKpiKeyForType(type), targetValue: cleanTargetValue },
  });

  return NextResponse.json({
    ok: true,
    businessType: dashboardConfig.businessType,
    businessTypeLabel: BUSINESS_TYPE_LABELS[type],
    primaryKpiLabel: primaryKpiLabelForType(type),
    targetValue: dashboardConfig.targetValue,
  });
}
