# Ads Chat

Chat with Claude in plain English about a connected Meta (Facebook) ad account's
performance - campaigns, ad sets, ads, spend, and insights like CTR/CPC/ROAS.

Accounts are real (email/password login), backed by Postgres via Prisma. Each
user connects one Meta ad account; its access token is encrypted at rest and
decrypted only when a request needs it.

## How it fits together

- **`prisma/schema.prisma`** - `User` (email + bcrypt password hash) and
  `MetaConnection` (one per user: ad account id + encrypted access token).
- **`lib/session.ts`** - the httpOnly session cookie identifies the logged-in
  user only (`userId`), encrypted via `iron-session` / `SESSION_SECRET`. It no
  longer carries the Meta token.
- **`lib/crypto.ts`** - AES-256-GCM encrypt/decrypt for the Meta access token
  at rest in `MetaConnection.accessTokenCiphertext`, keyed from a subkey
  derived from `SESSION_SECRET`.
- **`app/login/page.tsx`** + **`app/api/auth/{signup,login,logout}/route.ts`**
  - minimal email/password auth.
- **`app/page.tsx`** - connect page (requires login). Paste a Meta access
  token + ad account ID.
- **`app/api/connect/route.ts`** - validates the token/account against the
  Graph API, then upserts the encrypted `MetaConnection` row for the logged-in
  user.
- **`app/chat/page.tsx`** - chat UI. Keeps conversation history in browser
  state and resends it with every request (no server-side chat history).
- **`app/api/chat/route.ts`** - looks up the logged-in user's `MetaConnection`,
  decrypts the token, spawns the local MCP server as a child process (passing
  the Meta credentials in as environment variables, *not* as data Claude ever
  sees), lists its tools, and runs a manual Claude tool-use loop: call Claude
  -> if it wants a tool, run it via the MCP client and feed the result back ->
  repeat until Claude has a final answer.
- **`mcp-server/`** - a local MCP server (`@modelcontextprotocol/sdk`) that
  wraps the Meta Marketing (Graph) API. Tools: `get_ad_account`,
  `list_campaigns`, `list_ad_sets`, `list_ads`, `get_insights` (spend,
  impressions, clicks, CTR, CPC, CPM, reach, conversions, ROAS over a date
  range or preset), and `create_campaign` (always created PAUSED unless the
  chat explicitly confirms ACTIVE - requires the `ads_management`
  permission). It talks to `graph.facebook.com` directly using the
  access token it was spawned with.

## Setup

```bash
npm install
cp .env.example .env.local
# fill in DATABASE_URL, ANTHROPIC_API_KEY, SESSION_SECRET in .env.local
```

The `prisma` CLI reads a plain `.env` file (not `.env.local`), so also create
one with just the connection string:

```bash
echo "DATABASE_URL=<your connection string>" > .env
npm run db:migrate   # creates the User / MetaConnection tables
npm run dev
```

`npm run db:studio` opens a local GUI (Prisma Studio) to browse the database.

Required env vars (see `.env.example`):

- `DATABASE_URL` - a Postgres connection string. Any free hosted Postgres
  works (e.g. [Neon](https://neon.tech), no credit card required).
- `ANTHROPIC_API_KEY` - from the [Anthropic Console](https://console.anthropic.com/settings/keys).
- `SESSION_SECRET` - random string, 32+ characters (`openssl rand -base64 32`).

Optional: `CLAUDE_MODEL` (defaults to `claude-opus-5`), `META_GRAPH_API_VERSION`
(defaults to `v22.0`), `ANTHROPIC_WORKSPACE_ID` (only if your Anthropic key is
org-wide rather than workspace-scoped).

## Connecting a Meta ad account (MVP shortcut)

This asks for a **manually pasted long-lived access token** instead of a full
"Login with Facebook" OAuth flow. Get one from the
[Graph API Explorer](https://developers.facebook.com/tools/explorer/) (select
your app, grant `ads_read` - and `ads_management` too if you want to create
campaigns from the chat - generate a token, then exchange it for a
long-lived token) or from a System User in Business Manager. This is a known,
documented shortcut: a later version should read the connection from the
backend (real Facebook Login/OAuth) instead of asking users to paste a token.

## Build

```bash
npm run build
npm start
```
