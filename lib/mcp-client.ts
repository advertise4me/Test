import "server-only";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type Anthropic from "@anthropic-ai/sdk";

const PROJECT_ROOT = process.cwd();
const TSX_CLI = path.join(PROJECT_ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const MCP_SERVER_ENTRY = path.join(PROJECT_ROOT, "mcp-server", "index.ts");

export interface MetaAdsMcpSession {
  client: Client;
  /** Tool definitions in the shape the Anthropic Messages API expects. */
  tools: Anthropic.Tool[];
  callTool: (name: string, input: Record<string, unknown>) => Promise<string>;
  close: () => Promise<void>;
}

/**
 * Spawns the local Meta Ads MCP server as a short-lived child process (one per
 * chat request), connects an MCP client to it over stdio, and lists its tools.
 * The Meta access token / ad account id are passed as env vars to the child
 * process only - they are never sent to Claude or persisted anywhere.
 */
export async function startMetaAdsMcpSession(config: {
  accessToken: string;
  adAccountId: string;
}): Promise<MetaAdsMcpSession> {
  const transport = new StdioClientTransport({
    command: process.execPath, // the current Node.js binary
    args: [TSX_CLI, MCP_SERVER_ENTRY],
    env: {
      ...processEnvWhitelist(),
      META_ACCESS_TOKEN: config.accessToken,
      META_AD_ACCOUNT_ID: config.adAccountId,
    },
    stderr: "pipe",
  });

  const client = new Client({ name: "ads-chat-web", version: "0.1.0" });
  await client.connect(transport);

  const { tools } = await client.listTools();
  const anthropicTools: Anthropic.Tool[] = tools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? "",
    input_schema: (tool.inputSchema ?? { type: "object", properties: {} }) as Anthropic.Tool.InputSchema,
  }));

  const callTool = async (name: string, input: Record<string, unknown>): Promise<string> => {
    const result = await client.callTool({ name, arguments: input });
    const content = result.content as Array<{ type: string; text?: string }> | undefined;
    const text = content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("\n");
    return text || JSON.stringify(result);
  };

  return {
    client,
    tools: anthropicTools,
    callTool,
    close: async () => {
      await client.close();
    },
  };
}

/** A minimal, safe environment for the spawned MCP server child process. */
function processEnvWhitelist(): Record<string, string> {
  const allowed = ["PATH", "HOME", "NODE_ENV", "META_GRAPH_API_VERSION"];
  const env: Record<string, string> = {};
  for (const key of allowed) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  return env;
}
