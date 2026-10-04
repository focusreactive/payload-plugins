# CT website — how it runs on your infrastructure (demo hand-out)

One repository, one Dockerfile (`apps/cms/Dockerfile`), two images, both built on **your hardened
`debian:trixie` base image** and configured only through environment variables. Nothing reaches the
internet at runtime.

```
                 your network                                        public internet
┌──────────────────────────────────────────────────┐        ┌──────────────────────────────┐
│  Keycloak ──sign-in──▶  cms container            │        │  site container              │
│  (yours)                Payload admin + API      │ publish│  Nginx + static files        │
│                         draft preview            │───────▶│  (built by GitLab pipeline)  │
│                         server-rendered pages    │        │  :8080 behind your proxy     │
│                         :3000, behind your proxy │        └──────────────────────────────┘
│            │                                     │
│            ▼                                     │
│  PostgreSQL (yours, new db or schema)            │
│  media volume (add to backups)                   │
└──────────────────────────────────────────────────┘
```

## Images

| Target | What is inside | Runs as | Needs at runtime |
|---|---|---|---|
| `cms` | Node 24 (official tarball, checksum-verified) + the Next.js standalone server (Payload admin, API, preview, pages) + static assets | uid 10001, `tini` as PID 1 | `DATABASE_URL`, `PAYLOAD_SECRET`, `NEXT_PUBLIC_SERVER_URL`; optional Keycloak (`OIDC_*`), `CRON_SECRET` |
| `site` | `nginx-light` + the static website files | `www-data`, port 8080 | nothing |

Build stages: `node` (verified Node on your base) → `deps` (Bun installs workspace dependencies;
Bun exists **only** here) → `build` (plugins + `next build`, needs a reachable Postgres via the
`database_url` secret because pages are pre-rendered) → `cms` runtime → `site` runtime. Runtime
stages contain no package manager, no compiler, no build tooling.

## Commands

```bash
# build both images from the repo root (secrets are mounted for one RUN step, never stored in a layer)
docker build -f apps/cms/Dockerfile --target cms  -t ct/cms:1.0 \
  --build-arg BASE_IMAGE=registry.<client-domain>/base/debian:trixie \
  --secret id=npm_token,src=.secrets/npm_token --secret id=database_url,src=.secrets/database_url .
docker build -f apps/cms/Dockerfile --target site -t ct/site:1.0 \
  --build-arg BASE_IMAGE=registry.<client-domain>/base/debian:trixie .

# run the CMS (migrations run automatically on start; the server waits for Postgres)
docker run -d --name cms --env-file .env.docker -p 3000:3000 -v media:/app/apps/cms/public/media ct/cms:1.0

# prove the "no internet" claim
docker run --rm --network none --env-file .env.docker ct/cms:1.0   # still serves pages when Postgres is reachable on that network

# full local stack (compose): Postgres + CMS + edge proxy + cron (+ Keycloak with --profile sso)
cd apps/cms && cp .env.docker.example .env.docker && docker compose up -d
```

## Publishing flow (production)

1. An editor publishes in the CMS (drafts, versions, comments, scheduling all happen inside).
2. The CMS calls a GitLab webhook; the pipeline builds the static website and the `site` image.
3. Your existing deploy process rolls the new `site` image out; redeploying an older image rolls back.
4. In the demo the same hand-off is shown with `docker compose --profile snapshot run --rm snapshot`
   (mirrors the running site into `apps/cms/.local/site`) followed by `docker compose --profile site up -d site`.

## Operations notes

- **Database:** a new database or a schema on your shared PostgreSQL; the app only needs the connection string. Your backups cover it.
- **Media:** uploads sit on the `media` volume — add it to the backup routine. (On Vercel they go to Blob storage instead; same code.)
- **Scheduling:** the `cron` service pings `/api/scheduled-publish/run` once a minute with a bearer token; on your side any cron will do.
- **Base image updates:** rebuild both images from the Dockerfile with the new `BASE_IMAGE`; no other change.
- **Resource sizing (compose defaults):** cms 2 CPU / 2 GB, postgres 1 CPU / 1 GB, edge 0.25 CPU / 128 MB, cron 0.25 CPU / 128 MB, keycloak 1 CPU / 1.5 GB.
