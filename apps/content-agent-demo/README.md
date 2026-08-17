# Content Agent Demo

Local Payload CMS app for demonstrating [`payload-content-agent`](https://github.com/focusreactive/payload-content-agent)
— a schema-aware AI content agent that lives in the Payload admin panel.

Private, local-only. Not deployed, not published, and shares no code with `apps/cms`.

## What it demonstrates

| Capability | Where to see it |
|---|---|
| Schema introspection (zero config) | Ask the agent what collections exist |
| Block editing | Add or reorder Hero / Content / FAQ / CTA blocks on a page |
| Array-row editing | Add an FAQ item |
| Surgical rich-text editing | Rewrite a paragraph of a post |
| Translation | Translate a page into Spanish (`es`) |
| Bulk find/replace | Replace a URL across all 30 seeded posts |
| Draft-only writes + human review | Every agent write lands as a draft; approve it in the review panel |
| Persistent memory | Ask something, start a new conversation, refer back to it |

## Prerequisites

- Local Postgres 17 with `pgvector`
- GitHub read access to the private `focusreactive/payload-content-agent` repo (the dependency is a pinned git ref)
- An `OPENAI_API_KEY` — one key covers chat, subagents, background memory tasks and embeddings

## Setup

```bash
brew install pgvector
createdb content_agent_demo
psql -d content_agent_demo -c 'CREATE EXTENSION IF NOT EXISTS vector;'

cp .env.example .env    # then paste in OPENAI_API_KEY

bun install             # from the repo root
bun run payload migrate:create initial
bun run payload migrate
bun run generate:types
bun run seed
bun run dev
```

Admin: http://localhost:4042/admin — `admin@admin.com` / `admin`
Frontend: http://localhost:4042/en

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Payload's Postgres connection, and the agent's memory store (its own `content_agent` schema) |
| `PAYLOAD_SECRET` | Payload's signing secret. Load-bearing — see Gotchas |
| `MCP_API_KEY` | The key the agent sends to `/api/mcp` as `Authorization: Bearer <key>`. Must match the key written by `src/seed.ts` |
| `OPENAI_API_KEY` | Chat, subagents, background memory tasks and embeddings |
| `NEXT_PUBLIC_SERVER_URL` | Base URL used by live-preview URLs and the refresh listener |
| `PREVIEW_SECRET` | Reserved for the draft-mode preview routes |

## Gotchas

- **The agent dependency uses `www.github.com`, deliberately.** bun 1.3.14 rewrites canonical
  `github:owner/repo` and `git+https://github.com/...` specs to the unauthenticated
  `api.github.com/.../tarball/...` endpoint, which 404s on private repos — and it ignores
  `GITHUB_TOKEN`, `GH_TOKEN` and `BUN_CONFIG_TOKEN`. The non-canonical `www.github.com` host
  forces bun down the `git clone` path, which uses your local git credential helper. Do not
  "fix" it back to `github:`; install will break. The SHA is still pinned.
- **`PAYLOAD_SECRET` is load-bearing.** The MCP plugin stores only `HMAC-SHA256(PAYLOAD_SECRET, key)` as `apiKeyIndex`, so changing the secret invalidates the seeded MCP key. Re-run `bun run seed`.
- **New collections are not auto-granted.** Adding a collection requires enabling it in `mcpPlugin({ collections })` **and** granting it on the API key (add it to `keyData` in `src/seed.ts` and re-seed). Without the grant the agent sees the collection in the schema but has no `create` tool for it. A server restart is required either way — the agent caches the MCP tool list per process.
- **`experimentalTools` is deliberately not enabled.** In development it exposes `createCollection`/`updateCollection`/`deleteCollection`/`updateConfig`, which write and delete real `.ts` source files. The agent exposes every registered MCP tool unwrapped, so these must stay off.
- **`delete` grants are on.** `delete*` MCP tools reach the agent with no draft-forcing, no destructive-update gate, and no changeset recording. Re-run `bun run seed` to restore content.
- **Without pgvector** the agent still runs with temporal memory, LTM and present-state; only semantic recall is disabled. Installing the extension later self-heals on the next boot.
- **Agent version is pinned** to `#6562e94fbbdf`. Bump the SHA in `package.json` to pick up agent fixes.
- **Migrations are explicit** (`push: false`). Edit config → `bun run generate:types` → `bun run payload migrate:create` → `bun run payload migrate`.
