// Date-range math for the AI Summary tab's period selector. Every period is
// "current" vs. a "previous equivalent period" (e.g. this week vs last
// week) the UI compares against. Dates are plain YYYY-MM-DD strings in UTC
// - we don't have the connected ad account's timezone handy here, and a
// one-day fuzz at the edges doesn't matter for period-over-period framing.

export type PeriodKey =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_7_days"
  | "last_30_days"
  | "last_60_days"
  | "this_month"
  | "last_month";

/**
 * The period selector's dropdown groups, in display order - a thin divider
 * is rendered between each group. PERIOD_OPTIONS (the flat lookup list used
 * everywhere else) is derived from this, so the two can't drift apart.
 */
export const PERIOD_GROUPS: { key: PeriodKey; label: string }[][] = [
  [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
  ],
  [
    { key: "last_7_days", label: "Last 7 days" },
    { key: "last_30_days", label: "Last 30 days" },
    { key: "last_60_days", label: "Last 60 days" },
  ],
  [
    { key: "this_week", label: "This week" },
    { key: "this_month", label: "This month" },
    { key: "last_month", label: "Last month" },
  ],
];

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = PERIOD_GROUPS.flat();

export function isPeriodKey(value: unknown): value is PeriodKey {
  return typeof value === "string" && PERIOD_OPTIONS.some((opt) => opt.key === value);
}

export interface DateRange {
  since: string;
  until: string;
}

export interface PeriodRange {
  current: DateRange;
  previous: DateRange;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, delta: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + delta);
  return copy;
}

/** Monday of the week containing `d`. */
function startOfWeek(d: Date): Date {
  const day = d.getUTCDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDays(d, diffToMonday);
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function endOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

function addMonths(d: Date, delta: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1));
}

/** Builds the current + previous-equivalent date ranges for a period, anchored to `now`. */
export function getPeriodRange(period: PeriodKey, now: Date = new Date()): PeriodRange {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  switch (period) {
    case "today": {
      const yesterday = addDays(today, -1);
      return {
        current: { since: toISODate(today), until: toISODate(today) },
        previous: { since: toISODate(yesterday), until: toISODate(yesterday) },
      };
    }
    case "yesterday": {
      const yesterday = addDays(today, -1);
      const dayBefore = addDays(today, -2);
      return {
        current: { since: toISODate(yesterday), until: toISODate(yesterday) },
        previous: { since: toISODate(dayBefore), until: toISODate(dayBefore) },
      };
    }
    case "this_week": {
      const monday = startOfWeek(today);
      return {
        current: { since: toISODate(monday), until: toISODate(today) },
        previous: { since: toISODate(addDays(monday, -7)), until: toISODate(addDays(today, -7)) },
      };
    }
    case "last_7_days": {
      return {
        current: { since: toISODate(addDays(today, -6)), until: toISODate(today) },
        previous: { since: toISODate(addDays(today, -13)), until: toISODate(addDays(today, -7)) },
      };
    }
    case "last_30_days": {
      return {
        current: { since: toISODate(addDays(today, -29)), until: toISODate(today) },
        previous: { since: toISODate(addDays(today, -59)), until: toISODate(addDays(today, -30)) },
      };
    }
    case "last_60_days": {
      return {
        current: { since: toISODate(addDays(today, -59)), until: toISODate(today) },
        previous: { since: toISODate(addDays(today, -119)), until: toISODate(addDays(today, -60)) },
      };
    }
    case "this_month": {
      const monthStart = startOfMonth(today);
      const elapsedDays = today.getUTCDate(); // 1-indexed day of month
      const prevMonthStart = addMonths(monthStart, -1);
      const prevMonthEnd = endOfMonth(prevMonthStart);
      const prevUntil = addDays(prevMonthStart, elapsedDays - 1);
      return {
        current: { since: toISODate(monthStart), until: toISODate(today) },
        previous: {
          since: toISODate(prevMonthStart),
          until: toISODate(prevUntil > prevMonthEnd ? prevMonthEnd : prevUntil),
        },
      };
    }
    case "last_month": {
      const thisMonthStart = startOfMonth(today);
      const lastMonthStart = addMonths(thisMonthStart, -1);
      const lastMonthEnd = endOfMonth(lastMonthStart);
      const twoMonthsAgoStart = addMonths(thisMonthStart, -2);
      const twoMonthsAgoEnd = endOfMonth(twoMonthsAgoStart);
      return {
        current: { since: toISODate(lastMonthStart), until: toISODate(lastMonthEnd) },
        previous: { since: toISODate(twoMonthsAgoStart), until: toISODate(twoMonthsAgoEnd) },
      };
    }
  }
}

/** A wide lookback window used only for one-time business-type detection, independent of the selected period. */
export function getDetectionRange(now: Date = new Date()): DateRange {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { since: toISODate(addDays(today, -90)), until: toISODate(today) };
}
