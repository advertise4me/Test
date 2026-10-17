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

async function graphPostMultipart<T>(
  path: string,
  accessToken: string,
  fields: Record<string, string | undefined>,
  file: { fieldName: string; filename: string; mimeType: string; data: Buffer },
): Promise<T> {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) form.set(key, value);
  }
  form.set("access_token", accessToken);
  form.set(file.fieldName, new Blob([new Uint8Array(file.data)], { type: file.mimeType }), file.filename);

  const res = await fetch(`${GRAPH_API_BASE}${path}`, { method: "POST", body: form });
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

export interface MetaPage {
  id: string;
  name: string;
}

/** Pages the connected token can post ads as. Requires pages_show_list permission. */
export async function listPages(config: Pick<MetaClientConfig, "accessToken">) {
  return graphGet<GraphListResult<MetaPage>>("/me/accounts", config.accessToken, {
    fields: "id,name",
    limit: 50,
  });
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

export type ActiveOrPausedStatus = "ACTIVE" | "PAUSED";

export interface UpdateCampaignInput {
  status?: ActiveOrPausedStatus;
  /** In the ad account's currency minor unit, e.g. cents for USD. */
  dailyBudget?: number;
  /** In the ad account's currency minor unit, e.g. cents for USD. */
  lifetimeBudget?: number;
}

/** Edits an existing campaign - status and/or budget. Never creates anything new. */
export async function updateCampaign(
  config: MetaClientConfig,
  campaignId: string,
  input: UpdateCampaignInput,
) {
  return graphPost<{ success: boolean }>(`/${campaignId}`, config.accessToken, {
    status: input.status,
    daily_budget: input.dailyBudget !== undefined ? String(input.dailyBudget) : undefined,
    lifetime_budget: input.lifetimeBudget !== undefined ? String(input.lifetimeBudget) : undefined,
  });
}

export interface UpdateAdSetInput {
  status?: ActiveOrPausedStatus;
  /** In the ad account's currency minor unit, e.g. cents for USD. */
  dailyBudget?: number;
  /** In the ad account's currency minor unit, e.g. cents for USD. */
  lifetimeBudget?: number;
}

/** Edits an existing ad set - status and/or budget. Never creates anything new. */
export async function updateAdSet(
  config: MetaClientConfig,
  adSetId: string,
  input: UpdateAdSetInput,
) {
  return graphPost<{ success: boolean }>(`/${adSetId}`, config.accessToken, {
    status: input.status,
    daily_budget: input.dailyBudget !== undefined ? String(input.dailyBudget) : undefined,
    lifetime_budget: input.lifetimeBudget !== undefined ? String(input.lifetimeBudget) : undefined,
  });
}

/** Pauses or resumes an existing ad. Never creates anything new. */
export async function updateAdStatus(
  config: MetaClientConfig,
  adId: string,
  status: ActiveOrPausedStatus,
) {
  return graphPost<{ success: boolean }>(`/${adId}`, config.accessToken, { status });
}

// --- Targeting ------------------------------------------------------------
// Deliberately simple: country/radius geo-targeting + age + gender. Interest
// and behavior targeting need Meta's separate targeting-search API to
// resolve names to ids and aren't supported yet.

export interface SimpleTargeting {
  /** ISO 3166-1 alpha-2 country codes, e.g. ["US"]. */
  countries?: string[];
  /** Radius-based locations - no name lookup needed, just coordinates. */
  customLocations?: Array<{
    latitude: number;
    longitude: number;
    radius: number;
    distanceUnit?: "mile" | "kilometer";
  }>;
  ageMin?: number;
  ageMax?: number;
  /** 1 = male, 2 = female. Omit (or both) for all genders. */
  genders?: Array<1 | 2>;
}

function buildTargetingSpec(targeting: SimpleTargeting): Record<string, unknown> {
  const geoLocations: Record<string, unknown> = {};
  if (targeting.countries?.length) geoLocations.countries = targeting.countries;
  if (targeting.customLocations?.length) {
    geoLocations.custom_locations = targeting.customLocations.map((loc) => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
      radius: loc.radius,
      distance_unit: loc.distanceUnit ?? "mile",
    }));
  }

  const spec: Record<string, unknown> = {};
  if (Object.keys(geoLocations).length > 0) spec.geo_locations = geoLocations;
  if (targeting.ageMin !== undefined) spec.age_min = targeting.ageMin;
  if (targeting.ageMax !== undefined) spec.age_max = targeting.ageMax;
  if (targeting.genders?.length) spec.genders = targeting.genders;
  // publisher_platforms / positions deliberately omitted - Meta defaults to
  // automatic placements across Facebook and Instagram, which is what we want.
  return spec;
}

// --- Ad sets ----------------------------------------------------------------

export type OptimizationGoal =
  | "LINK_CLICKS"
  | "LANDING_PAGE_VIEWS"
  | "IMPRESSIONS"
  | "REACH"
  | "LEAD_GENERATION"
  | "CONVERSATIONS"
  | "OFFSITE_CONVERSIONS"
  | "THRUPLAY";

export interface CreateAdSetInput {
  campaignId: string;
  name: string;
  optimizationGoal: OptimizationGoal;
  billingEvent?: "IMPRESSIONS" | "LINK_CLICKS";
  targeting: SimpleTargeting;
  /** Always defaults to PAUSED - callers must opt in to ACTIVE explicitly. */
  status?: ActiveOrPausedStatus;
  /** Only set if the campaign itself has no budget (i.e. not using campaign budget optimization). */
  dailyBudget?: number;
  lifetimeBudget?: number;
  /** ISO 8601. Required by Meta when lifetimeBudget is set. */
  endTime?: string;
}

export async function createAdSet(config: MetaClientConfig, input: CreateAdSetInput) {
  return graphPost<{ id: string }>(`/${config.adAccountId}/adsets`, config.accessToken, {
    name: input.name,
    campaign_id: input.campaignId,
    optimization_goal: input.optimizationGoal,
    billing_event: input.billingEvent ?? "IMPRESSIONS",
    targeting: JSON.stringify(buildTargetingSpec(input.targeting)),
    status: input.status ?? "PAUSED",
    daily_budget: input.dailyBudget !== undefined ? String(input.dailyBudget) : undefined,
    lifetime_budget: input.lifetimeBudget !== undefined ? String(input.lifetimeBudget) : undefined,
    end_time: input.endTime,
  });
}

// --- Image/video uploads, creatives, and ads ---------------------------------

export interface UploadedFile {
  filename: string;
  mimeType: string;
  data: Buffer;
}

export async function uploadAdImage(config: MetaClientConfig, file: UploadedFile) {
  const response = await graphPostMultipart<{
    images: Record<string, { hash: string; url?: string }>;
  }>(
    `/${config.adAccountId}/adimages`,
    config.accessToken,
    {},
    { fieldName: "source", filename: file.filename, mimeType: file.mimeType, data: file.data },
  );
  const entry = Object.values(response.images)[0];
  if (!entry) throw new MetaApiError("Meta did not return an image hash for the upload.");
  return { hash: entry.hash, url: entry.url };
}

export async function uploadAdVideo(config: MetaClientConfig, file: UploadedFile) {
  const response = await graphPostMultipart<{ id: string }>(
    `/${config.adAccountId}/advideos`,
    config.accessToken,
    {},
    { fieldName: "source", filename: file.filename, mimeType: file.mimeType, data: file.data },
  );
  return { videoId: response.id };
}

export interface CreateAdCreativeInput {
  pageId: string;
  /** Where the ad's button/click sends people - a product or booking page URL. */
  link: string;
  /** Primary text. */
  message: string;
  /** Headline. */
  headline?: string;
  /** e.g. LEARN_MORE, SHOP_NOW, BOOK_TRAVEL, CONTACT_US, SIGN_UP, CALL_NOW. */
  callToAction?: string;
  /** Use for an image ad - the hash returned by uploadAdImage. */
  imageHash?: string;
  /** Use for a video ad - the id returned by uploadAdVideo. */
  videoId?: string;
  /** A still-frame thumbnail for a video ad (image hash from uploadAdImage). */
  videoThumbnailImageHash?: string;
}

export async function createAdCreative(config: MetaClientConfig, input: CreateAdCreativeInput) {
  const callToAction = input.callToAction
    ? { type: input.callToAction, value: { link: input.link } }
    : undefined;

  const objectStorySpec: Record<string, unknown> = { page_id: input.pageId };

  if (input.videoId) {
    objectStorySpec.video_data = {
      video_id: input.videoId,
      title: input.headline,
      message: input.message,
      call_to_action: callToAction,
      image_hash: input.videoThumbnailImageHash,
    };
  } else {
    objectStorySpec.link_data = {
      link: input.link,
      message: input.message,
      name: input.headline,
      call_to_action: callToAction,
      image_hash: input.imageHash,
    };
  }

  return graphPost<{ id: string }>(`/${config.adAccountId}/adcreatives`, config.accessToken, {
    object_story_spec: JSON.stringify(objectStorySpec),
  });
}

export interface CreateAdInput {
  adSetId: string;
  name: string;
  creativeId: string;
  /** Always defaults to PAUSED - callers must opt in to ACTIVE explicitly. */
  status?: ActiveOrPausedStatus;
}

export async function createAd(config: MetaClientConfig, input: CreateAdInput) {
  return graphPost<{ id: string }>(`/${config.adAccountId}/ads`, config.accessToken, {
    name: input.name,
    adset_id: input.adSetId,
    creative: JSON.stringify({ creative_id: input.creativeId }),
    status: input.status ?? "PAUSED",
  });
}
