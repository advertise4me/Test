"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PeriodKey } from "@/lib/period";
import type { SummaryResponse } from "@/lib/summaryTypes";
import type { NextStep } from "@/lib/aiCopy";
import { dashboardType } from "@/lib/theme/dashboard";
import PeriodSelector from "@/components/dashboard/summary/PeriodSelector";
import StatusBanner from "@/components/dashboard/summary/StatusBanner";
import KpiGrid from "@/components/dashboard/summary/KpiGrid";
import WhatThisMeansCard from "@/components/dashboard/summary/WhatThisMeansCard";
import FunnelCard from "@/components/dashboard/summary/FunnelCard";
import NextStepsCard from "@/components/dashboard/summary/NextStepsCard";
import SummarySkeleton from "@/components/dashboard/summary/SummarySkeleton";
import PullToRefresh from "@/components/dashboard/summary/PullToRefresh";
import { NoSpendCard, TokenExpiredBanner, LoadErrorCard, LearningPhaseNote } from "@/components/dashboard/summary/EmptyStates";
import NoAccountAssignedCard from "@/components/dashboard/NoAccountAssignedCard";

export default function AiSummaryPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodKey>("this_week");
  const [data, setData] = useState<SummaryResponse | null>(null);
  // Tracks which period `data` actually reflects, so "loading" is derived
  // (true while a fetch for the current `period` is still in flight)
  // instead of a separate flag set directly inside an effect.
  const [loadedPeriod, setLoadedPeriod] = useState<PeriodKey | null>(null);
  const loading = loadedPeriod !== period;

  const fetchSummary = useCallback(
    async (p: PeriodKey): Promise<SummaryResponse | null> => {
      try {
        const res = await fetch(`/api/summary?period=${p}`);
        if (res.status === 401) {
          router.replace("/login");
          return null;
        }
        return (await res.json()) as SummaryResponse;
      } catch {
        return { state: "error", message: "Network error - please try again." };
      }
    },
    [router],
  );

  useEffect(() => {
    let ignore = false;
    fetchSummary(period).then((json) => {
      if (ignore || json === null) return;
      setData(json);
      setLoadedPeriod(period);
    });
    return () => {
      ignore = true;
    };
  }, [period, fetchSummary]);

  function handlePeriodChange(next: PeriodKey) {
    setPeriod(next);
  }

  async function handleRefresh() {
    const json = await fetchSummary(period);
    if (json !== null) setData(json);
  }

  function handleNextStep(step: NextStep) {
    router.push(`/chat?prefill=${encodeURIComponent(step.prefill)}`);
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <main className="flex min-h-full flex-1 flex-col gap-[var(--db-card-gap)] px-[var(--db-gutter)] py-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className={dashboardType.screenTitle} style={{ color: "var(--db-text-primary)" }}>
            Your business at a glance
          </h1>
        </div>
        <PeriodSelector value={period} onChange={handlePeriodChange} />

        {loading && <SummarySkeleton />}

        {!loading && data?.state === "no_account_assigned" && <NoAccountAssignedCard />}
        {!loading && data?.state === "no_spend" && <NoSpendCard period={data.period} />}
        {!loading && data?.state === "token_expired" && <TokenExpiredBanner />}
        {!loading && data?.state === "error" && <LoadErrorCard message={data.message} />}

        {!loading && data?.state === "ok" && (
          <>
            <StatusBanner status={data.status} />
            {data.learningPhase && data.status.level !== "attention" && <LearningPhaseNote />}
            <KpiGrid kpis={data.kpis} />
            <WhatThisMeansCard text={data.whatThisMeans} />
            <FunnelCard funnel={data.funnel} />
            <NextStepsCard nextSteps={data.nextSteps} onSelect={handleNextStep} />
          </>
        )}
      </main>
    </PullToRefresh>
  );
}
