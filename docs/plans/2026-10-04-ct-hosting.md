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

# prove the "no internet" claim: an --internal network has no route out, only to Postgres
docker network create --internal ct-offline
docker network connect ct-offline ct-postgres-1
docker run --rm --network ct-offline -p 3000:3000 --env-file .env.docker \
  -e DATABASE_URL=postgres://ct:ct@ct-postgres-1:5432/ct ct/cms:1.0
docker exec <container> node -e "fetch('https://example.com').then(()=>console.log('online'),()=>console.log('offline'))"

# full local stack (compose): Postgres + CMS + edge proxy + cron (+ Keycloak with --profile sso)
cd apps/cms && cp .env.docker.example .env.docker
mkdir -p .secrets && printf %s "$NPM_TOKEN" > .secrets/npm_token \
  && printf %s 'postgres://ct:ct@localhost:5432/ct' > .secrets/database_url
docker compose up -d postgres          # the image build migrates + pre-renders against it (host network)
docker compose build cms               # plugins → migrate → next build (standalone)
docker compose up -d                   # → http://localhost:8080
DATABASE_URL=postgres://ct:ct@localhost:5432/ct bun run seed:ct   # from the host, once
docker compose --profile sso up -d keycloak   # → sign in at http://localhost:8080/admin with editor@ct.demo / ct-demo
```

## Publishing flow (production)

1. An editor publishes in the CMS (drafts, versions, comments, scheduling all happen inside).
2. The CMS calls a GitLab webhook; the pipeline builds the static website and the `site` image.
3. Your existing deploy process rolls the new `site` image out; redeploying an older image rolls back.
4. In the demo the same hand-off is shown with `docker compose --profile snapshot run --rm snapshot`
   (mirrors the running site into `apps/cms/.local/site`) followed by `docker compose --profile site up -d site`.

## Operations notes

- **Database:** a new database or a schema on your shared PostgreSQL; the app only needs the connection string. Your backups cover it.
  The `pgvector` extension must be available (semantic search); the first migration runs
  `CREATE EXTENSION IF NOT EXISTS vector`, so either grant that or create the extension once as a DBA.
- **Migrations:** applied automatically when the server starts (verified against an empty database: all
  migrations run on the first request); the image build also migrates the database it pre-renders against.
- **Server binding:** keep `HOSTNAME=0.0.0.0` (the image default). Binding the standalone server to
  127.0.0.1 makes its internal locale rewrites loop through redirects.
- **Keycloak:** `OIDC_ISSUER` is the browser-facing issuer (what tokens carry); `OIDC_INTERNAL_ISSUER`
  is where the container fetches discovery when the IdP is reached through an internal hostname.
  Roles follow groups on every login (`OIDC_ROLE_MAP`, default cms-admins → Admin, cms-editors → Editor,
  cms-authors → Author; anyone else → Author).
- **Media:** uploads sit on the `media` volume — add it to the backup routine. (On the agency's Vercel preview they go to Blob storage instead; same code.)
- **Scheduling:** the `cron` service pings `/api/scheduled-publish/run` once a minute with a bearer token; on your side any cron will do.
- **Base image updates:** rebuild both images from the Dockerfile with the new `BASE_IMAGE`; no other change.
- **Resource sizing (compose defaults):** cms 2 CPU / 2 GB, postgres 1 CPU / 1 GB, edge 0.25 CPU / 128 MB, cron 0.25 CPU / 128 MB, keycloak 1 CPU / 1.5 GB.
