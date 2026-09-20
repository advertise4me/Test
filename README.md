# Ads Chat

Chat with Claude in plain English about a connected Meta (Facebook) ad account's
performance - campaigns, ad sets, ads, spend, and insights like CTR/CPC/ROAS.

No database, no user accounts. The only "identity" is the Meta ad account
connected for the current browser session, held in an encrypted, httpOnly
cookie.

## How it fits together

- **`app/page.tsx`** - connect page. Paste a Meta access token + ad account ID.
- **`app/api/connect/route.ts`** - validates the token/account against the Graph
  API, then encrypts `{ accessToken, adAccountId, accountName }` into an
  httpOnly session cookie (AES-256-GCM via `iron-session`, keyed by
  `SESSION_SECRET`). The token is never written to disk or a database.
- **`app/chat/page.tsx`** - chat UI. Keeps conversation history in browser
  state and resends it with every request (the server is stateless).
- **`app/api/chat/route.ts`** - reads the session cookie, spawns the local MCP
  server as a child process (passing the Meta credentials in as environment
  variables, *not* as data Claude ever sees), lists its tools, and runs a
  manual Claude tool-use loop: call Claude -> if it wants a tool, run it via
  the MCP client and feed the result back -> repeat until Claude has a final
  answer.
- **`mcp-server/`** - a local MCP server (`@modelcontextprotocol/sdk`) that
  wraps the Meta Marketing (Graph) API. Tools: `get_ad_account`,
  `list_campaigns`, `list_ad_sets`, `list_ads`, `get_insights` (spend,
  impressions, clicks, CTR, CPC, CPM, reach, conversions, ROAS over a date
  range or preset). It talks to `graph.facebook.com` directly using the
  access token it was spawned with.

## Setup

```bash
npm install
cp .env.example .env.local
# then fill in ANTHROPIC_API_KEY and SESSION_SECRET in .env.local
npm run dev
```

Required env vars (see `.env.example`):

- `ANTHROPIC_API_KEY` - from the [Anthropic Console](https://console.anthropic.com/settings/keys).
- `SESSION_SECRET` - random string, 32+ characters (`openssl rand -base64 32`).

Optional: `CLAUDE_MODEL` (defaults to `claude-opus-5`), `META_GRAPH_API_VERSION`
(defaults to `v22.0`).

## Connecting a Meta ad account (MVP shortcut)

This MVP asks for a **manually pasted long-lived access token** instead of a
full "Login with Facebook" OAuth flow. Get one from the
[Graph API Explorer](https://developers.facebook.com/tools/explorer/) (select
your app, grant `ads_read`, generate a token, then exchange it for a
long-lived token) or from a System User in Business Manager. This is
documented as a known limitation: a production version of this app would
implement the OAuth redirect flow instead of asking users to paste a token.

## Build

```bash
npm run build
npm start
```
