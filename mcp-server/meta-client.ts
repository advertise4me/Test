// Minimal client for the Meta Marketing (Graph) API.
// Used only from within the local MCP server process - never imported by
// Next.js route handlers directly, so the access token never has to cross
// that boundary as anything other than an environment variable.

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || "v22.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface MetaClientConfig {
  accessToken: string;
  adAccountId: string;
}

export class MetaApiError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly type?: string,
  ) {
    super(message);
    this.name = "MetaApiError";
  }
}

/** Accepts either "123456789" or "act_123456789" and returns the "act_"-prefixed form the Graph API expects. */
export function normalizeAdAccountId(id: string): string {
  const trimmed = id.trim();
  return trimmed.startsWith("act_") ? trimmed : `act_${trimmed}`;
}

async function graphGet<T>(
  path: string,
  accessToken: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const url = new URL(`${GRAPH_API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  const body = await res.json().catch(() => null);

  if (!res.ok || body?.error) {
    const err = body?.error;
    throw new MetaApiError(
      err?.message || `Meta Graph API request failed with status ${res.status}`,
      err?.code,
      err?.type,
    );
  }

  return body as T;
}

async function graphPost<T>(
  path: string,
  accessToken: string,
  params: Record<string, string | undefined>,
): Promise<T> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) body.set(key, value);
  }
  body.set("access_token", accessToken);

  const res = await fetch(`${GRAPH_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const responseBody = await res.json().catch(() => null);

  if (!res.ok || responseBody?.error) {
    const err = responseBody?.error;
    throw new MetaApiError(
      err?.message || `Meta Graph API request failed with status ${res.status}`,
      err?.code,
      err?.type,
    );
  }

  return responseBody as T;
}

export async function getAdAccount(config: MetaClientConfig) {
  return graphGet<{
    id: string;
    account_id: string;
    name: string;
    account_status: number;
    currency: string;
    timezone_name: string;
  }>(`/${config.adAccountId}`, config.accessToken, {
    fields: "id,account_id,name,account_status,currency,timezone_name",
  });
}

export interface ListOptions {
  limit?: number;
  after?: string;
}

const CAMPAIGN_FIELDS =
  "id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time";
const ADSET_FIELDS =
  "id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,optimization_goal,billing_event,start_time,end_time";
const AD_FIELDS =
  "id,name,status,effective_status,adset_id,campaign_id,created_time";

export interface GraphListResult<T> {
  data: T[];
  paging?: { cursors?: { before?: string; after?: string }; next?: string };
}

export async function listCampaigns(
  config: MetaClientConfig,
  opts: ListOptions & { statusFilter?: string[] } = {},
) {
  return graphGet<GraphListResult<Record<string, unknown>>>(
    `/${config.adAccountId}/campaigns`,
    config.accessToken,
    {
      fields: CAMPAIGN_FIELDS,
      limit: opts.limit ?? 50,
      after: opts.after,
      effective_status: opts.statusFilter ? JSON.stringify(opts.statusFilter) : undefined,
    },
  );
}

export async function listAdSets(
  config: MetaClientConfig,
  opts: ListOptions & { campaignId?: string } = {},
) {
  const node = opts.campaignId ?? config.adAccountId;
  return graphGet<GraphListResult<Record<string, unknown>>>(
    `/${node}/adsets`,
    config.accessToken,
    { fields: ADSET_FIELDS, limit: opts.limit ?? 50, after: opts.after },
  );
}

export async function listAds(
  config: MetaClientConfig,
  opts: ListOptions & { adSetId?: string; campaignId?: string } = {},
) {
  const node = opts.adSetId ?? opts.campaignId ?? config.adAccountId;
  return graphGet<GraphListResult<Record<string, unknown>>>(
    `/${node}/ads`,
    config.accessToken,
    { fields: AD_FIELDS, limit: opts.limit ?? 50, after: opts.after },
  );
}

export type InsightsLevel = "account" | "campaign" | "adset" | "ad";

const INSIGHTS_FIELDS = [
  "date_start",
  "date_stop",
  "campaign_name",
  "adset_name",
  "ad_name",
  "spend",
  "impressions",
  "reach",
  "frequency",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "cpp",
  "actions",
  "action_values",
  "purchase_roas",
].join(",");

export interface InsightsOptions {
  objectId?: string;
  level?: InsightsLevel;
  datePreset?: string;
  since?: string;
  until?: string;
  timeIncrement?: string;
  limit?: number;
}

export async function getInsights(config: MetaClientConfig, opts: InsightsOptions = {}) {
  const node = opts.objectId ?? config.adAccountId;
  const timeRange =
    opts.since && opts.until
      ? JSON.stringify({ since: opts.since, until: opts.until })
      : undefined;

  return graphGet<GraphListResult<Record<string, unknown>>>(
    `/${node}/insights`,
    config.accessToken,
    {
      fields: INSIGHTS_FIELDS,
      level: opts.level,
      date_preset: timeRange ? undefined : opts.datePreset ?? "last_30d",
      time_range: timeRange,
      time_increment: opts.timeIncrement,
      limit: opts.limit ?? 100,
    },
  );
}

export type CampaignObjective =
  | "OUTCOME_APP_PROMOTION"
  | "OUTCOME_AWARENESS"
  | "OUTCOME_ENGAGEMENT"
  | "OUTCOME_LEADS"
  | "OUTCOME_SALES"
  | "OUTCOME_TRAFFIC";

export type SpecialAdCategory =
  | "NONE"
  | "HOUSING"
  | "EMPLOYMENT"
  | "CREDIT"
  | "ISSUES_ELECTIONS_POLITICS"
  | "ONLINE_GAMBLING_AND_GAMING";

export interface CreateCampaignInput {
  name: string;
  objective: CampaignObjective;
  /** Always defaults to PAUSED - callers must opt in to ACTIVE explicitly. */
  status?: "ACTIVE" | "PAUSED";
  specialAdCategories?: SpecialAdCategory[];
  /** In the ad account's currency minor unit, e.g. cents for USD. */
  dailyBudget?: number;
  /** In the ad account's currency minor unit, e.g. cents for USD. */
  lifetimeBudget?: number;
}

export async function createCampaign(config: MetaClientConfig, input: CreateCampaignInput) {
  return graphPost<{ id: string }>(`/${config.adAccountId}/campaigns`, config.accessToken, {
    name: input.name,
    objective: input.objective,
    status: input.status ?? "PAUSED",
    special_ad_categories: JSON.stringify(input.specialAdCategories ?? []),
    daily_budget: input.dailyBudget !== undefined ? String(input.dailyBudget) : undefined,
    lifetime_budget: input.lifetimeBudget !== undefined ? String(input.lifetimeBudget) : undefined,
  });
}
