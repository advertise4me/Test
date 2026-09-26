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
  createCampaign,
  getAdAccount,
  getInsights,
  listAdSets,
  listAds,
  listCampaigns,
  normalizeAdAccountId,
  type CampaignObjective,
  type InsightsLevel,
  type SpecialAdCategory,
} from "./meta-client.js";

const accessToken = process.env.META_ACCESS_TOKEN;
const rawAdAccountId = process.env.META_AD_ACCOUNT_ID;

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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("meta-ads-mcp: fatal error", error);
  process.exit(1);
});
