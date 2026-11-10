import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getUserAdAccountAssignment } from "@/lib/adAccountAccess";
import { BUSINESS_TYPE_LABELS, primaryKpiLabelForType, type BusinessType } from "@/lib/kpiConfig";
import packageJson from "@/package.json";

// Consolidated read for the whole Settings tab (Phase 5a) - one request
// instead of one per section, since nearly everything on this screen is
// visible at once.
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  const [user, assignment, dashboardConfig] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    getUserAdAccountAssignment(userId),
    prisma.dashboardConfig.findUnique({ where: { userId } }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const businessType = (dashboardConfig?.businessType as BusinessType | undefined) ?? null;

  return NextResponse.json({
    isAdmin: user.isAdmin,
    profile: {
      email: user.email,
      fullName: user.fullName,
      businessName: user.businessName,
      businessWebsite: user.businessWebsite,
      language: user.language,
    },
    businessTypeOptions: Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => ({ value, label })),
    dashboardConfig: dashboardConfig
      ? {
          businessType,
          businessTypeLabel: businessType ? BUSINESS_TYPE_LABELS[businessType] : null,
          primaryKpiLabel: businessType ? primaryKpiLabelForType(businessType) : null,
          targetValue: dashboardConfig.targetValue,
          currency: dashboardConfig.currency,
        }
      : null,
    adAccountAssignment: assignment
      ? { assigned: true, adAccountId: assignment.adAccountId, adAccountName: assignment.adAccountName }
      : { assigned: false },
    spendingControls: {
      monthlySpendCap: user.monthlySpendCap,
    },
    notifications: {
      weeklySummary: user.notifyWeeklySummary,
      needsAttention: user.notifyNeedsAttention,
      metaAccessLost: user.notifyMetaAccessLost,
    },
    about: {
      appVersion: packageJson.version,
      supportEmail: "admin@advertise4me.com",
    },
  });
}
