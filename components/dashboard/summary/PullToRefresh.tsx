"use client";

import { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 70;

/**
 * Lightweight pull-to-refresh: only activates when the drag starts at the
 * top of the nearest scrollable ancestor (the dashboard shell's
 * overflow-y-auto content area), so it doesn't fight normal scrolling.
 */
export default function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void> | void; children: React.ReactNode }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (refreshing) return;
    const scrollParent = e.currentTarget.closest(".overflow-y-auto") as HTMLElement | null;
    startY.current = !scrollParent || scrollParent.scrollTop > 0 ? null : e.touches[0].clientY;
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setPull(Math.min(delta, THRESHOLD * 1.5));
  }

  async function handleTouchEnd() {
    const shouldRefresh = startY.current !== null && pull >= THRESHOLD;
    startY.current = null;
    if (shouldRefresh) {
      setRefreshing(true);
      setPull(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    setPull(0);
  }

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div className="flex items-center justify-center overflow-hidden" style={{ height: pull, color: "var(--db-text-secondary)" }}>
        <RefreshCw size={18} strokeWidth={1.75} className={refreshing ? "animate-spin" : undefined} />
      </div>
      {children}
    </div>
  );
}
