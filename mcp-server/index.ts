#!/usr/bin/env -S npx tsx
// Local MCP server exposing the Meta Marketing API as tools.
//
// Spawned as a short-lived child process per chat request (see lib/mcp-client.ts).
// The Meta access token and ad account id are passed in via environment
// variables at spawn time (META_ACCESS_TOKEN / META_AD_ACCOUNT_ID) rather than
// as tool arguments, so Claude never sees the raw credential.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  MetaApiError,
  createAd,
  createAdCreative,
  createAdSet,
  createCampaign,
  getAdAccount,
  getInsights,
  listAdSets,
  listAds,
  listCampaigns,
  normalizeAdAccountId,
  updateAdSet,
  updateAdStatus,
  updateCampaign,
  type ActiveOrPausedStatus,
  type CampaignObjective,
  type InsightsLevel,
  type OptimizationGoal,
  type SpecialAdCategory,
} from "./meta-client.js";

const accessToken = process.env.META_ACCESS_TOKEN;
const rawAdAccountId = process.env.META_AD_ACCOUNT_ID;
// Optional - only needed by create_ad_creative. Not every connection has a
// linked Page yet, so this doesn't block startup like the two above do.
const pageId = process.env.META_PAGE_ID;

if (!accessToken || !rawAdAccountId) {
  console.error(
    "meta-ads-mcp: missing META_ACCESS_TOKEN or META_AD_ACCOUNT_ID environment variables",
  );
  process.exit(1);
}

const config = { accessToken, adAccountId: normalizeAdAccountId(rawAdAccountId) };

const server = new McpServer({ name: "meta-ads-mcp", version: "0.1.0" });

function toolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function toolError(error: unknown) {
  const message = error instanceof MetaApiError ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

server.registerTool(
  "get_ad_account",
  {
    title: "Get ad account details",
    description:
      "Get the connected Meta ad account's name, currency, timezone, and account status.",
    inputSchema: {},
  },
  async () => {
    try {
      return toolResult(await getAdAccount(config));
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "list_campaigns",
  {
    title: "List campaigns",
    description:
      "List campaigns in the connected ad account, with id, name, status, objective, and budget.",
    inputSchema: {
      status_filter: z
        .array(z.enum(["ACTIVE", "PAUSED", "DELETED", "ARCHIVED"]))
        .optional()
        .describe("Only return campaigns whose effective status is one of these values."),
      limit: z.number().int().min(1).max(200).optional().describe("Max campaigns to return (default 50)."),
    },
  },
  async ({ status_filter, limit }) => {
    try {
      return toolResult(await listCampaigns(config, { statusFilter: status_filter, limit }));
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "list_ad_sets",
  {
    title: "List ad sets",
    description:
      "List ad sets, optionally scoped to one campaign. Returns id, name, status, budget, and optimization goal.",
    inputSchema: {
      campaign_id: z.string().optional().describe("If provided, only list ad sets in this campaign."),
      limit: z.number().int().min(1).max(200).optional().describe("Max ad sets to return (default 50)."),
    },
  },
  async ({ campaign_id, limit }) => {
    try {
      return toolResult(await listAdSets(config, { campaignId: campaign_id, limit }));
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "list_ads",
  {
    title: "List ads",
    description:
      "List ads, optionally scoped to one ad set or campaign. Returns id, name, and status.",
    inputSchema: {
      ad_set_id: z.string().optional().describe("If provided, only list ads in this ad set."),
      campaign_id: z
        .string()
        .optional()
        .describe("If provided (and ad_set_id is not), only list ads in this campaign."),
      limit: z.number().int().min(1).max(200).optional().describe("Max ads to return (default 50)."),
    },
  },
  async ({ ad_set_id, campaign_id, limit }) => {
    try {
      return toolResult(await listAds(config, { adSetId: ad_set_id, campaignId: campaign_id, limit }));
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "get_insights",
  {
    title: "Get performance insights",
    description:
      "Get performance metrics (spend, impressions, clicks, CTR, CPC, CPM, reach, frequency, conversions, and ROAS) " +
      "for the ad account or a specific campaign/ad set/ad, over a date range. " +
      "Use date_preset for common ranges, or since/until (YYYY-MM-DD) for a custom range.",
    inputSchema: {
      object_id: z
        .string()
        .optional()
        .describe("Campaign, ad set, or ad id to scope insights to. Defaults to the whole ad account."),
      level: z
        .enum(["account", "campaign", "adset", "ad"])
        .optional()
        .describe(
          "Aggregation level. Use 'campaign' when object_id is the ad account and you want one row per campaign, etc.",
        ),
      date_preset: z
        .enum([
          "today",
          "yesterday",
          "last_3d",
          "last_7d",
          "last_14d",
          "last_28d",
          "last_30d",
          "last_90d",
          "this_month",
          "last_month",
          "this_quarter",
          "maximum",
        ])
        .optional()
        .describe("Predefined date range. Ignored if since/until are both provided. Default: last_30d."),
      since: z.string().optional().describe("Custom range start date, YYYY-MM-DD."),
      until: z.string().optional().describe("Custom range end date, YYYY-MM-DD."),
      time_increment: z
        .string()
        .optional()
        .describe("Set to '1' to break results down by day, or a number of days per bucket."),
    },
  },
  async ({ object_id, level, date_preset, since, until, time_increment }) => {
    try {
      return toolResult(
        await getInsights(config, {
          objectId: object_id,
          level: level as InsightsLevel | undefined,
          datePreset: date_preset,
          since,
          until,
          timeIncrement: time_increment,
        }),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

const CAMPAIGN_OBJECTIVES: [CampaignObjective, ...CampaignObjective[]] = [
  "OUTCOME_APP_PROMOTION",
  "OUTCOME_AWARENESS",
  "OUTCOME_ENGAGEMENT",
  "OUTCOME_LEADS",
  "OUTCOME_SALES",
  "OUTCOME_TRAFFIC",
];

const SPECIAL_AD_CATEGORIES: [SpecialAdCategory, ...SpecialAdCategory[]] = [
  "NONE",
  "HOUSING",
  "EMPLOYMENT",
  "CREDIT",
  "ISSUES_ELECTIONS_POLITICS",
  "ONLINE_GAMBLING_AND_GAMING",
];

server.registerTool(
  "create_campaign",
  {
    title: "Create a campaign",
    description:
      "Create a new campaign in the connected ad account. The campaign is created PAUSED unless status is " +
      "explicitly set to ACTIVE. Setting status to ACTIVE can start spending real money immediately - only do " +
      "that after the user has explicitly confirmed the name, objective, and budget in this conversation. " +
      "Requires the connected access token to have the ads_management permission.",
    inputSchema: {
      name: z.string().min(1).describe("Campaign name."),
      objective: z.enum(CAMPAIGN_OBJECTIVES).describe("Campaign objective."),
      status: z
        .enum(["ACTIVE", "PAUSED"])
        .optional()
        .describe("Defaults to PAUSED. Only set ACTIVE after explicit user confirmation."),
      daily_budget: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          "Daily budget in the ad account's currency minor unit (e.g. cents for USD). Omit if ad sets will set their own budgets.",
        ),
      lifetime_budget: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Lifetime budget in the ad account's currency minor unit (e.g. cents for USD)."),
      special_ad_categories: z
        .array(z.enum(SPECIAL_AD_CATEGORIES))
        .optional()
        .describe("Meta's regulated ad categories that apply, if any. Defaults to none."),
    },
  },
  async ({ name, objective, status, daily_budget, lifetime_budget, special_ad_categories }) => {
    try {
      return toolResult(
        await createCampaign(config, {
          name,
          objective,
          status,
          dailyBudget: daily_budget,
          lifetimeBudget: lifetime_budget,
          specialAdCategories: special_ad_categories,
        }),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

const STATUS_VALUES: [ActiveOrPausedStatus, ...ActiveOrPausedStatus[]] = ["ACTIVE", "PAUSED"];

server.registerTool(
  "update_campaign",
  {
    title: "Pause, resume, or change the budget of an existing campaign",
    description:
      "Edits an existing campaign's status and/or budget. Never creates a new campaign. Pausing is low-risk " +
      "and reversible; setting status to ACTIVE or changing a budget can change what the account spends, so " +
      "confirm the exact change (old value -> new value) with the user in this conversation before calling this.",
    inputSchema: {
      campaign_id: z.string().min(1).describe("The campaign to edit."),
      status: z.enum(STATUS_VALUES).optional().describe("Pause or resume the campaign."),
      daily_budget: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("New daily budget in the ad account's currency minor unit (e.g. cents for USD)."),
      lifetime_budget: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("New lifetime budget in the ad account's currency minor unit (e.g. cents for USD)."),
    },
  },
  async ({ campaign_id, status, daily_budget, lifetime_budget }) => {
    try {
      return toolResult(
        await updateCampaign(config, campaign_id, {
          status,
          dailyBudget: daily_budget,
          lifetimeBudget: lifetime_budget,
        }),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "update_ad_set",
  {
    title: "Pause, resume, or change the budget of an existing ad set",
    description:
      "Edits an existing ad set's status and/or budget. Never creates a new ad set. Pausing is low-risk and " +
      "reversible; setting status to ACTIVE or changing a budget can change what the account spends, so confirm " +
      "the exact change (old value -> new value) with the user in this conversation before calling this.",
    inputSchema: {
      ad_set_id: z.string().min(1).describe("The ad set to edit."),
      status: z.enum(STATUS_VALUES).optional().describe("Pause or resume the ad set."),
      daily_budget: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("New daily budget in the ad account's currency minor unit (e.g. cents for USD)."),
      lifetime_budget: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("New lifetime budget in the ad account's currency minor unit (e.g. cents for USD)."),
    },
  },
  async ({ ad_set_id, status, daily_budget, lifetime_budget }) => {
    try {
      return toolResult(
        await updateAdSet(config, ad_set_id, {
          status,
          dailyBudget: daily_budget,
          lifetimeBudget: lifetime_budget,
        }),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "update_ad_status",
  {
    title: "Pause or resume an existing ad",
    description:
      "Pauses or resumes a single existing ad. Never creates a new ad. Low-risk and reversible, but still " +
      "confirm which ad and the new status with the user in this conversation before calling this.",
    inputSchema: {
      ad_id: z.string().min(1).describe("The ad to pause or resume."),
      status: z.enum(STATUS_VALUES).describe("New status for the ad."),
    },
  },
  async ({ ad_id, status }) => {
    try {
      return toolResult(await updateAdStatus(config, ad_id, status));
    } catch (error) {
      return toolError(error);
    }
  },
);

const OPTIMIZATION_GOALS: [OptimizationGoal, ...OptimizationGoal[]] = [
  "LINK_CLICKS",
  "LANDING_PAGE_VIEWS",
  "IMPRESSIONS",
  "REACH",
  "LEAD_GENERATION",
  "CONVERSATIONS",
  "OFFSITE_CONVERSIONS",
  "THRUPLAY",
];

const CALL_TO_ACTIONS = [
  "LEARN_MORE",
  "SHOP_NOW",
  "SIGN_UP",
  "BOOK_TRAVEL",
  "CONTACT_US",
  "CALL_NOW",
  "GET_QUOTE",
  "SUBSCRIBE",
  "DOWNLOAD",
  "WATCH_MORE",
  "SEND_MESSAGE",
  "GET_DIRECTIONS",
] as const;

server.registerTool(
  "create_ad_set",
  {
    title: "Create an ad set (targeting + budget) under a campaign",
    description:
      "Creates a new ad set inside an existing campaign - this is where targeting (location, age, gender) and " +
      "(usually) the budget live. Always created PAUSED unless status is explicitly ACTIVE. Only set a budget " +
      "here if the campaign itself was created without one; Meta rejects a budget set on both. Placements are " +
      "deliberately left automatic (Facebook + Instagram) - do not try to restrict them unless asked. Interest " +
      "or behavior targeting (e.g. 'people interested in cooking') is not supported yet - only location, age, " +
      "and gender.",
    inputSchema: {
      campaign_id: z.string().min(1).describe("The campaign this ad set belongs to."),
      name: z.string().min(1).describe("Ad set name."),
      optimization_goal: z
        .enum(OPTIMIZATION_GOALS)
        .describe(
          "What Meta optimizes delivery for, e.g. LINK_CLICKS for traffic, OFFSITE_CONVERSIONS for sales, " +
            "LEAD_GENERATION for leads.",
        ),
      billing_event: z
        .enum(["IMPRESSIONS", "LINK_CLICKS"])
        .optional()
        .describe("Defaults to IMPRESSIONS."),
      countries: z
        .array(z.string().length(2))
        .optional()
        .describe("ISO country codes to target, e.g. ['US']."),
      custom_locations: z
        .array(
          z.object({
            latitude: z.number(),
            longitude: z.number(),
            radius: z.number().positive(),
            distance_unit: z.enum(["mile", "kilometer"]).optional(),
          }),
        )
        .optional()
        .describe("Radius-based locations, e.g. a city center + radius in miles."),
      age_min: z.number().int().min(13).max(65).optional(),
      age_max: z.number().int().min(13).max(65).optional(),
      genders: z
        .array(z.union([z.literal(1), z.literal(2)]))
        .optional()
        .describe("1 = male, 2 = female. Omit for all genders."),
      status: z.enum(["ACTIVE", "PAUSED"]).optional().describe("Defaults to PAUSED."),
      daily_budget: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Only if the campaign has no budget of its own. Minor currency unit (cents for USD)."),
      lifetime_budget: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Only if the campaign has no budget of its own. Minor currency unit (cents for USD)."),
      end_time: z
        .string()
        .optional()
        .describe("ISO 8601 end date/time. Required by Meta when lifetime_budget is set."),
    },
  },
  async ({
    campaign_id,
    name,
    optimization_goal,
    billing_event,
    countries,
    custom_locations,
    age_min,
    age_max,
    genders,
    status,
    daily_budget,
    lifetime_budget,
    end_time,
  }) => {
    try {
      return toolResult(
        await createAdSet(config, {
          campaignId: campaign_id,
          name,
          optimizationGoal: optimization_goal,
          billingEvent: billing_event,
          targeting: {
            countries,
            customLocations: custom_locations,
            ageMin: age_min,
            ageMax: age_max,
            genders,
          },
          status,
          dailyBudget: daily_budget,
          lifetimeBudget: lifetime_budget,
          endTime: end_time,
        }),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "create_ad_creative",
  {
    title: "Create an ad creative from an uploaded image or video",
    description:
      "Creates the creative (image/video + copy + button) that an ad shows. Use the image_hash or video_id the " +
      "user got back when they uploaded a file in this conversation - never invent one. Provide exactly one of " +
      "image_hash or video_id, not both. Posts as the ad account's connected Facebook Page automatically.",
    inputSchema: {
      link: z
        .string()
        .url()
        .describe("Where the ad's button sends people - a product or booking page URL from the business's site."),
      message: z.string().min(1).describe("Primary text of the ad."),
      headline: z.string().optional().describe("Short headline."),
      call_to_action: z.enum(CALL_TO_ACTIONS).optional(),
      image_hash: z.string().optional().describe("From a prior image upload in this conversation."),
      video_id: z.string().optional().describe("From a prior video upload in this conversation."),
      video_thumbnail_image_hash: z
        .string()
        .optional()
        .describe("For a video ad: an uploaded image hash to use as the thumbnail."),
    },
  },
  async ({ link, message, headline, call_to_action, image_hash, video_id, video_thumbnail_image_hash }) => {
    if (!pageId) {
      return toolError(
        "No Facebook Page is linked to this account yet, so an ad creative can't be posted. " +
          "The user needs to link a Page on the connect page first.",
      );
    }
    if (image_hash && video_id) {
      return toolError("Provide only one of image_hash or video_id, not both.");
    }
    if (!image_hash && !video_id) {
      return toolError("Provide image_hash or video_id - ask the user to upload a file first if neither exists.");
    }
    try {
      return toolResult(
        await createAdCreative(config, {
          pageId,
          link,
          message,
          headline,
          callToAction: call_to_action,
          imageHash: image_hash,
          videoId: video_id,
          videoThumbnailImageHash: video_thumbnail_image_hash,
        }),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "create_ad",
  {
    title: "Create an ad from an ad set and a creative",
    description:
      "Creates a new ad, pairing an ad set with a creative made by create_ad_creative. Always created PAUSED " +
      "unless status is explicitly ACTIVE.",
    inputSchema: {
      ad_set_id: z.string().min(1).describe("The ad set this ad belongs to."),
      name: z.string().min(1).describe("Ad name."),
      creative_id: z.string().min(1).describe("The id returned by create_ad_creative."),
      status: z.enum(["ACTIVE", "PAUSED"]).optional().describe("Defaults to PAUSED."),
    },
  },
  async ({ ad_set_id, name, creative_id, status }) => {
    try {
      return toolResult(await createAd(config, { adSetId: ad_set_id, name, creativeId: creative_id, status }));
    } catch (error) {
      return toolError(error);
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("meta-ads-mcp: fatal error", error);
  process.exit(1);
});
