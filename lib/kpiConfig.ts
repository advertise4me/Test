// Business-type detection and the per-type KPI / funnel / status config for
// the AI Summary tab. This is the single place that knows "what does an
// e-commerce account vs. a lead-gen account care about" - components just
// render whatever buildDashboardData() hands them, they never branch on
// business type themselves.

export type BusinessType = "ecommerce" | "lead_gen" | "local_messages" | "awareness_traffic" | "fallback";

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  ecommerce: "E-commerce",
  lead_gen: "Lead generation",
  local_messages: "Local / messages & calls",
  awareness_traffic: "Awareness / traffic",
  fallback: "General",
};

export type ActionTotals = Record<string, number>;

export interface InsightsSummary {
  spend: number;
  reach: number;
  impressions: number;
  /** Prefers inline_link_clicks (real link taps) over raw clicks (includes likes/comments etc). */
  clicks: number;
  actions: ActionTotals;
  actionValues: ActionTotals;
  costPerAction: ActionTotals;
  /** Meta's own purchase_roas, value-weighted across whatever rows were summed. Null if never reported. */
  purchaseRoas: number | null;
}

export function emptyInsightsSummary(): InsightsSummary {
  return { spend: 0, reach: 0, impressions: 0, clicks: 0, actions: {}, actionValues: {}, costPerAction: {}, purchaseRoas: null };
}

function num(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/** Meta returns actions/action_values/cost_per_action_type as [{action_type, value}, ...]. */
function actionListToTotals(list: unknown): ActionTotals {
  const totals: ActionTotals = {};
  if (!Array.isArray(list)) return totals;
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const actionType = (entry as Record<string, unknown>).action_type;
    const value = (entry as Record<string, unknown>).value;
    if (typeof actionType === "string") totals[actionType] = (totals[actionType] ?? 0) + num(value);
  }
  return totals;
}

/**
 * Sums one or more raw Meta insights rows (e.g. one per campaign) into a
 * single totals object. purchase_roas is reported as revenue/spend per row,
 * so it's recombined from the summed spend and purchase action_values
 * rather than averaged naively.
 */
export function aggregateInsights(rows: Array<Record<string, unknown>>): InsightsSummary {
  const summary = emptyInsightsSummary();
  for (const row of rows) {
    summary.spend += num(row.spend);
    summary.reach += num(row.reach);
    summary.impressions += num(row.impressions);
    summary.clicks += num(row.inline_link_clicks ?? row.clicks);

    const actions = actionListToTotals(row.actions);
    const actionValues = actionListToTotals(row.action_values);
    for (const [key, value] of Object.entries(actions)) summary.actions[key] = (summary.actions[key] ?? 0) + value;
    for (const [key, value] of Object.entries(actionValues)) {
      summary.actionValues[key] = (summary.actionValues[key] ?? 0) + value;
    }
  }

  const purchaseRevenue = sumActions(summary.actionValues, PURCHASE_ACTION_TYPES);
  summary.purchaseRoas = summary.spend > 0 && purchaseRevenue > 0 ? purchaseRevenue / summary.spend : null;

  // Recompute cost-per-action from the summed totals (cost-weighted, not an average of per-row rates).
  for (const key of Object.keys(summary.actions)) {
    const count = summary.actions[key];
    if (count > 0) summary.costPerAction[key] = summary.spend / count;
  }

  return summary;
}

function sumActions(totals: ActionTotals, candidates: string[]): number {
  return candidates.reduce((sum, key) => sum + (totals[key] ?? 0), 0);
}

function firstAvailable(totals: ActionTotals, candidates: string[]): number | null {
  for (const key of candidates) {
    if (totals[key] !== undefined) return totals[key];
  }
  return null;
}

// --- Action type vocabularies -------------------------------------------
// Meta reports the "same" conversion under slightly different action_type
// keys depending on how it was tracked (pixel vs. the newer "omni" events
// that unify web+app+offline). We treat any of these as the same signal.

const PURCHASE_ACTION_TYPES = ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"];
const VIEW_CONTENT_ACTION_TYPES = ["omni_view_content", "view_content", "offsite_conversion.fb_pixel_view_content"];
const INITIATE_CHECKOUT_ACTION_TYPES = [
  "omni_initiated_checkout",
  "initiate_checkout",
  "offsite_conversion.fb_pixel_initiate_checkout",
];
const LANDING_PAGE_VIEW_ACTION_TYPES = ["landing_page_view"];
const LEAD_ACTION_TYPES = ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"];
const MESSAGING_ACTION_TYPES = [
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.total_messaging_connection",
];
const CALL_ACTION_TYPES = ["click_to_call_call_confirm", "click_to_call_native_call_placed"];

/**
 * Infers the business type from the connected account's campaign objectives
 * and which conversion action types it actually has data for. Order
 * matters - e.g. an account can have a Sales-objective campaign that also
 * happens to log a stray lead, so we check for the most specific, highest-
 * intent signal first.
 */
export function detectBusinessType(objectives: string[], actions: ActionTotals): BusinessType {
  const objectiveSet = new Set(objectives);
  const has = (candidates: string[]) => candidates.some((key) => (actions[key] ?? 0) > 0);

  if (has(PURCHASE_ACTION_TYPES) || objectiveSet.has("OUTCOME_SALES")) return "ecommerce";
  if (has(LEAD_ACTION_TYPES) || objectiveSet.has("OUTCOME_LEADS")) return "lead_gen";
  if (has(MESSAGING_ACTION_TYPES) || has(CALL_ACTION_TYPES)) return "local_messages";
  if (objectiveSet.has("OUTCOME_AWARENESS") || objectiveSet.has("OUTCOME_TRAFFIC")) return "awareness_traffic";
  return "fallback";
}

// --- Formatting ------------------------------------------------------------

// Whole units for anything >= $1 - a KPI tile is a big-number glance, not a
// ledger, and cents make the number wrap/truncate at tile width. Below $1
// (e.g. a few cents per click) we keep 2 decimals - rounding that to "$0"
// would actively mislead rather than just lose precision.
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: Math.abs(amount) < 1 ? 2 : 0 }).format(
      amount,
    );
  } catch {
    return `$${amount.toFixed(Math.abs(amount) < 1 ? 2 : 0)}`;
  }
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));
}

export function formatRatio(value: number): string {
  return `${value.toFixed(2)}x`;
}

// --- KPI tiles ---------------------------------------------------------

export interface KpiChange {
  direction: "up" | "down";
  percent: number;
  /** Whether this direction of change is good news for this metric (e.g. down is good for cost-per-lead). */
  isGood: boolean;
}

export interface KpiTile {
  key: string;
  label: string;
  icon: "spend" | "sales" | "orders" | "roas" | "leads" | "costPerLead" | "reach" | "conversations" | "calls" | "costPerContact" | "clicks" | "costPerClick";
  value: string;
  change: KpiChange | null;
}

interface KpiDef {
  key: string;
  label: string;
  icon: KpiTile["icon"];
  lowerIsBetter: boolean;
  /** Returns null if this KPI can't be computed at all for this account (not just zero this period). */
  getValue: (s: InsightsSummary, currency: string) => number | null;
  format: (value: number, currency: string) => string;
}

function pctChange(current: number, previous: number): KpiChange | null {
  if (previous <= 0) return null;
  const percent = ((current - previous) / previous) * 100;
  return { direction: percent >= 0 ? "up" : "down", percent: Math.abs(percent), isGood: false };
}

function buildTile(def: KpiDef, current: InsightsSummary, previous: InsightsSummary, currency: string): KpiTile | null {
  const value = def.getValue(current, currency);
  if (value === null) return null;
  const prevValue = def.getValue(previous, currency);
  const change: KpiChange | null = prevValue !== null ? pctChange(value, prevValue) : null;
  if (change) change.isGood = def.lowerIsBetter ? change.direction === "down" : change.direction === "up";
  return { key: def.key, label: def.label, icon: def.icon, value: def.format(value, currency), change };
}

const SPEND: KpiDef = {
  key: "spend",
  label: "Money spent",
  icon: "spend",
  lowerIsBetter: false,
  getValue: (s) => s.spend,
  format: (v, c) => formatMoney(v, c),
};
const REACH: KpiDef = {
  key: "reach",
  label: "People reached",
  icon: "reach",
  lowerIsBetter: false,
  getValue: (s) => s.reach,
  format: (v) => formatCount(v),
};
const CLICKS: KpiDef = {
  key: "clicks",
  label: "People who clicked",
  icon: "clicks",
  lowerIsBetter: false,
  getValue: (s) => s.clicks,
  format: (v) => formatCount(v),
};
const COST_PER_CLICK: KpiDef = {
  key: "cost_per_click",
  label: "Cost per click",
  icon: "costPerClick",
  lowerIsBetter: true,
  getValue: (s) => (s.clicks > 0 ? s.spend / s.clicks : null),
  format: (v, c) => formatMoney(v, c),
};
const SALES: KpiDef = {
  key: "sales",
  label: "Sales from ads",
  icon: "sales",
  lowerIsBetter: false,
  getValue: (s) => (firstAvailable(s.actionValues, PURCHASE_ACTION_TYPES) !== null ? sumActions(s.actionValues, PURCHASE_ACTION_TYPES) : null),
  format: (v, c) => formatMoney(v, c),
};
const ORDERS: KpiDef = {
  key: "orders",
  label: "Orders",
  icon: "orders",
  lowerIsBetter: false,
  getValue: (s) => firstAvailable(s.actions, PURCHASE_ACTION_TYPES),
  format: (v) => formatCount(v),
};
const ROAS: KpiDef = {
  key: "roas",
  label: "Return on ad spend",
  icon: "roas",
  lowerIsBetter: false,
  getValue: (s) => s.purchaseRoas,
  format: (v) => formatRatio(v),
};
const LEADS: KpiDef = {
  key: "leads",
  label: "Leads",
  icon: "leads",
  lowerIsBetter: false,
  getValue: (s) => firstAvailable(s.actions, LEAD_ACTION_TYPES),
  format: (v) => formatCount(v),
};
const COST_PER_LEAD: KpiDef = {
  key: "cost_per_lead",
  label: "Cost per lead",
  icon: "costPerLead",
  lowerIsBetter: true,
  getValue: (s) => {
    const leads = firstAvailable(s.actions, LEAD_ACTION_TYPES);
    return leads && leads > 0 ? s.spend / leads : null;
  },
  format: (v, c) => formatMoney(v, c),
};
const CONVERSATIONS: KpiDef = {
  key: "conversations",
  label: "Conversations started",
  icon: "conversations",
  lowerIsBetter: false,
  getValue: (s) => firstAvailable(s.actions, MESSAGING_ACTION_TYPES),
  format: (v) => formatCount(v),
};
const CALLS: KpiDef = {
  key: "calls",
  label: "Calls",
  icon: "calls",
  lowerIsBetter: false,
  getValue: (s) => firstAvailable(s.actions, CALL_ACTION_TYPES),
  format: (v) => formatCount(v),
};
const IMPRESSIONS: KpiDef = {
  key: "impressions",
  label: "Times your ad was shown",
  icon: "reach",
  lowerIsBetter: false,
  getValue: (s) => s.impressions,
  format: (v) => formatCount(v),
};
const COST_PER_CONTACT: KpiDef = {
  key: "cost_per_contact",
  label: "Cost per contact",
  icon: "costPerContact",
  lowerIsBetter: true,
  getValue: (s) => {
    const contacts = sumActions(s.actions, [...MESSAGING_ACTION_TYPES, ...CALL_ACTION_TYPES]);
    return contacts > 0 ? s.spend / contacts : null;
  },
  format: (v, c) => formatMoney(v, c),
};

// Per business type: the 4 KPI slots, in priority order, each with fallback
// candidates so a tile is never left blank if that signal isn't tracked.
// Every slot's fallback chain ends in a "core" metric (spend/reach/clicks/
// impressions) that's always computable, so a tile is never left blank.
const KPI_SLOTS: Record<BusinessType, KpiDef[][]> = {
  ecommerce: [[SPEND], [SALES, ORDERS, CLICKS], [ORDERS, CLICKS], [ROAS, COST_PER_CLICK, IMPRESSIONS]],
  lead_gen: [[SPEND], [LEADS, CLICKS], [COST_PER_LEAD, COST_PER_CLICK, IMPRESSIONS], [REACH]],
  local_messages: [[SPEND], [CONVERSATIONS, CLICKS], [CALLS, REACH], [COST_PER_CONTACT, COST_PER_CLICK, IMPRESSIONS]],
  awareness_traffic: [[SPEND], [REACH], [CLICKS], [COST_PER_CLICK, IMPRESSIONS]],
  fallback: [[SPEND], [REACH], [CLICKS], [COST_PER_CLICK, IMPRESSIONS]],
};

const HEADLINE_KPI: Record<BusinessType, KpiDef[]> = {
  ecommerce: [ROAS, COST_PER_CLICK],
  lead_gen: [COST_PER_LEAD, COST_PER_CLICK],
  local_messages: [COST_PER_CONTACT, COST_PER_CLICK],
  awareness_traffic: [COST_PER_CLICK],
  fallback: [CLICKS],
};

export function buildKpiTiles(type: BusinessType, current: InsightsSummary, previous: InsightsSummary, currency: string): KpiTile[] {
  const tiles: KpiTile[] = [];
  for (const candidates of KPI_SLOTS[type]) {
    for (const def of candidates) {
      const tile = buildTile(def, current, previous, currency);
      if (tile) {
        tiles.push(tile);
        break;
      }
    }
  }
  return tiles;
}

function buildHeadlineTile(type: BusinessType, current: InsightsSummary, previous: InsightsSummary, currency: string): KpiTile {
  for (const def of HEADLINE_KPI[type]) {
    const tile = buildTile(def, current, previous, currency);
    if (tile) return tile;
  }
  return buildTile(CLICKS, current, previous, currency) ?? { key: "clicks", label: "Clicks", icon: "clicks", value: "0", change: null };
}

// --- Funnel --------------------------------------------------------------

export interface FunnelStep {
  label: string;
  count: number;
  displayValue: string;
}

export interface FunnelConfig {
  title: string;
  subtitle: string;
}

const FUNNEL_CONFIG: Record<BusinessType, FunnelConfig> = {
  ecommerce: { title: "From click to purchase", subtitle: "How people moved toward buying" },
  lead_gen: { title: "From click to lead", subtitle: "How people moved toward signing up" },
  local_messages: { title: "From ad to conversation", subtitle: "How people reached out" },
  awareness_traffic: { title: "From reach to your site", subtitle: "How people found their way to you" },
  fallback: { title: "From reach to click", subtitle: "How people responded to your ads" },
};

function buildFunnelSteps(type: BusinessType, s: InsightsSummary): FunnelStep[] {
  const rawSteps: Array<{ label: string; count: number | null }> = (() => {
    switch (type) {
      case "ecommerce":
        return [
          { label: "Clicked", count: s.clicks },
          { label: "Viewed a product", count: firstAvailable(s.actions, VIEW_CONTENT_ACTION_TYPES) },
          { label: "Started checkout", count: firstAvailable(s.actions, INITIATE_CHECKOUT_ACTION_TYPES) },
          { label: "Purchased", count: firstAvailable(s.actions, PURCHASE_ACTION_TYPES) },
        ];
      case "lead_gen":
        return [
          { label: "Clicked", count: s.clicks },
          { label: "Opened the page or form", count: firstAvailable(s.actions, LANDING_PAGE_VIEW_ACTION_TYPES) },
          { label: "Submitted a lead", count: firstAvailable(s.actions, LEAD_ACTION_TYPES) },
        ];
      case "local_messages":
        return [
          { label: "Saw the ad", count: s.impressions },
          { label: "Clicked", count: s.clicks },
          {
            label: "Started a conversation or call",
            count: (() => {
              const total = sumActions(s.actions, [...MESSAGING_ACTION_TYPES, ...CALL_ACTION_TYPES]);
              return total > 0 ? total : null;
            })(),
          },
        ];
      case "awareness_traffic":
        return [
          { label: "Reached", count: s.reach },
          { label: "Clicked", count: s.clicks },
          { label: "Landed on the site", count: firstAvailable(s.actions, LANDING_PAGE_VIEW_ACTION_TYPES) },
        ];
      case "fallback":
        return [
          { label: "Reached", count: s.reach },
          { label: "Clicked", count: s.clicks },
        ];
    }
  })();

  // Steps are already defined in funnel order (each step is a subset of the one
  // before it), so steps[0] - once zero-data steps are dropped - is the widest
  // bar the UI scales the rest against.
  const steps = rawSteps.filter((step): step is { label: string; count: number } => step.count !== null && step.count > 0);
  return steps.map((step) => ({ label: step.label, count: step.count, displayValue: formatCount(step.count) }));
}

// --- Status ---------------------------------------------------------------

export type StatusLevel = "on_track" | "watch" | "attention";

export interface Status {
  level: StatusLevel;
  headline: string;
  detail: string;
}

interface StatusInput {
  type: BusinessType;
  current: InsightsSummary;
  previous: InsightsSummary;
  currency: string;
  targetValue: number | null;
  learningPhase: boolean;
  headline: KpiTile;
  secondary: KpiTile | null;
}

function headlineDefFor(type: BusinessType): KpiDef {
  return HEADLINE_KPI[type][0] ?? CLICKS;
}

// What "got zero results" means per business type - a raw count, not a
// ratio, so a metric like cost-per-click (undefined when there are no
// clicks at all) doesn't dodge the "spend with zero results" check.
const RESULT_COUNT: Record<BusinessType, (s: InsightsSummary) => number> = {
  ecommerce: (s) => firstAvailable(s.actions, PURCHASE_ACTION_TYPES) ?? 0,
  lead_gen: (s) => firstAvailable(s.actions, LEAD_ACTION_TYPES) ?? 0,
  local_messages: (s) => sumActions(s.actions, [...MESSAGING_ACTION_TYPES, ...CALL_ACTION_TYPES]),
  awareness_traffic: (s) => s.clicks,
  fallback: (s) => s.clicks,
};

export function buildStatus(input: StatusInput): Status {
  const { type, current, headline, secondary, targetValue, learningPhase } = input;
  const def = headlineDefFor(type);
  const headlineValue = def.getValue(current, input.currency);

  const zeroResults = current.spend > 0 && RESULT_COUNT[type](current) === 0;

  let level: StatusLevel;
  if (zeroResults) {
    level = "attention";
  } else if (targetValue !== null && headlineValue !== null) {
    const hitTarget = def.lowerIsBetter ? headlineValue <= targetValue : headlineValue >= targetValue;
    const offByPercent = targetValue !== 0 ? Math.abs((headlineValue - targetValue) / targetValue) * 100 : 0;
    if (hitTarget) level = "on_track";
    else if (offByPercent <= 10) level = "watch";
    else level = "attention";
  } else if (headline.change) {
    if (headline.change.isGood && headline.change.percent >= 10) level = "on_track";
    else if (headline.change.percent <= 10) level = "watch";
    else level = "attention";
  } else {
    level = "watch";
  }

  if (learningPhase && level === "on_track") level = "watch";

  const parts: string[] = [];
  if (current.spend > 0) parts.push(`You spent ${formatMoney(current.spend, input.currency)}`);
  if (secondary) parts.push(`${secondary.label.toLowerCase()} came to ${secondary.value}`);
  const detail = parts.length > 0 ? `${parts.join(" and ")}.` : "There wasn't any spend to report for this period.";

  const headlines: Record<StatusLevel, string> = {
    on_track: "You're on track",
    watch: learningPhase ? "Still getting up to speed" : "Keep an eye on it",
    attention: zeroResults ? "Spending without results" : "This needs your attention",
  };

  return { level, headline: headlines[level], detail };
}

// --- Top-level assembly ----------------------------------------------------

export interface DashboardData {
  businessType: BusinessType;
  status: Status;
  kpis: KpiTile[];
  funnel: { title: string; subtitle: string; steps: FunnelStep[] };
  headlineLabel: string;
}

export function buildDashboardData(
  type: BusinessType,
  current: InsightsSummary,
  previous: InsightsSummary,
  currency: string,
  targetValue: number | null,
  learningPhase: boolean,
): DashboardData {
  const kpis = buildKpiTiles(type, current, previous, currency);
  const headline = buildHeadlineTile(type, current, previous, currency);
  const funnelConfig = FUNNEL_CONFIG[type];
  const steps = buildFunnelSteps(type, current);
  const status = buildStatus({
    type,
    current,
    previous,
    currency,
    targetValue,
    learningPhase,
    headline,
    secondary: kpis[1] ?? null,
  });

  return {
    businessType: type,
    status,
    kpis,
    funnel: { title: funnelConfig.title, subtitle: funnelConfig.subtitle, steps },
    headlineLabel: headline.label,
  };
}
