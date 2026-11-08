// Shared shape of GET /api/summary's response, used by both the route
// handler and the AI Summary page so they can't drift apart.
import type { BusinessType, DashboardData, Status } from "@/lib/kpiConfig";
import type { PeriodKey } from "@/lib/period";
import type { NextStep } from "@/lib/aiCopy";

export type SummaryResponse =
  | { state: "no_connection" }
  | { state: "no_spend"; period: PeriodKey }
  | { state: "token_expired" }
  | { state: "error"; message: string }
  | {
      state: "ok";
      period: PeriodKey;
      currency: string;
      businessType: BusinessType;
      learningPhase: boolean;
      status: Status;
      kpis: DashboardData["kpis"];
      funnel: DashboardData["funnel"];
      whatThisMeans: string;
      nextSteps: NextStep[];
    };
