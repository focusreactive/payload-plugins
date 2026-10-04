# syntax=docker/dockerfile:1.7-labs
# ──────────────────────────────────────────────────────────────────────────────────────────────
#  CT website — container build
#
#  Two deliverable images from one file (select with --target):
#
#    cms   → the private CMS / preview server: Payload admin, API, draft preview and the
#            server-rendered site. Runs INSIDE the client's network behind Keycloak.
#    site  → the public static website: Nginx serving files produced by the publish pipeline.
#            The only thing that faces the internet.
#
#  Design rules (from the client's brief):
#    • Base image is the client's hardened Debian trixie — pass it with
#        --build-arg BASE_IMAGE=registry.<client-domain>/base/debian:trixie
#      (defaults to the public debian:trixie-slim so anyone can build it).
#    • All configuration comes from environment variables (see .env.docker.example).
#    • No internet access at runtime: everything is downloaded in build stages only.
#    • Runtime stages contain no package managers, no Bun, no compilers, run as non-root.
#
#  Build (from the MONOREPO ROOT, the context must include packages/ and apps/cms/):
#
#    docker build -f apps/cms/Dockerfile --target cms  -t ct/cms:dev \
#      --secret id=npm_token,src=.secrets/npm_token \
#      --secret id=database_url,src=.secrets/database_url .
#
#    docker build -f apps/cms/Dockerfile --target site -t ct/site:dev .
#
#  Why two secrets?
#    npm_token     one private package (@fr-private/payload-plugin-visual-editing) lives on npm.
#    database_url  `next build` pre-renders pages and therefore talks to Postgres during the
#                  build (generateStaticParams, PPR). Point it at a reachable database — in the
#                  client's GitLab pipeline that is their Postgres, locally the compose one.
#                  Secrets are mounted for the RUN step only and never end up in a layer.
# ──────────────────────────────────────────────────────────────────────────────────────────────

ARG BASE_IMAGE=debian:trixie-slim
# Pin to the current Node 24 LTS release when you build; check https://nodejs.org/dist/latest-v24.x/
ARG NODE_VERSION=24.11.1
# Must match "packageManager" in the root package.json.
ARG BUN_VERSION=1.3.9

# ──────────────────────────────── stage: node ───────────────────────────────────────────────
# Installs a verified Node binary on the client's base image. Debian's own nodejs package is too
# old for Next.js 16, so we take the official tarball and check it against SHASUMS256.txt.
FROM ${BASE_IMAGE} AS node
ARG NODE_VERSION
ARG TARGETARCH
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl xz-utils; \
    rm -rf /var/lib/apt/lists/*; \
    case "${TARGETARCH}" in amd64) arch=x64 ;; arm64) arch=arm64 ;; *) echo "unsupported arch ${TARGETARCH}"; exit 1 ;; esac; \
    curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${arch}.tar.xz"; \
    curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt"; \
    grep " node-v${NODE_VERSION}-linux-${arch}.tar.xz\$" SHASUMS256.txt | sha256sum -c -; \
    mkdir -p /opt/node; \
    tar -xJf "node-v${NODE_VERSION}-linux-${arch}.tar.xz" -C /opt/node --strip-components=1; \
    rm -f "node-v${NODE_VERSION}-linux-${arch}.tar.xz" SHASUMS256.txt
ENV PATH=/opt/node/bin:${PATH}

# ──────────────────────────────── stage: deps ───────────────────────────────────────────────
# Installs workspace dependencies. Only package manifests are copied here so this layer is
# reused as long as dependencies do not change.
FROM node AS deps
ARG BUN_VERSION
RUN npm install -g "bun@${BUN_VERSION}"
WORKDIR /repo
COPY package.json bun.lock bunfig.toml turbo.json .npmrc ./
# --parents keeps the directory structure (BuildKit labs syntax, see the first line).
COPY --parents packages/*/package.json apps/*/package.json ./
RUN --mount=type=secret,id=npm_token,required=false \
    set -eux; \
    export NPM_TOKEN="$(cat /run/secrets/npm_token 2>/dev/null || true)"; \
    bun install --frozen-lockfile

# ──────────────────────────────── stage: build ──────────────────────────────────────────────
# Builds the workspace plugins and the Next.js app in standalone mode. The standalone output is
# a self-contained server with only the node_modules it actually needs.
FROM deps AS build
COPY packages ./packages
COPY apps/cms ./apps/cms
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--max-old-space-size=6144
RUN --mount=type=secret,id=database_url,required=false \
    set -eux; \
    export DATABASE_URL="$(cat /run/secrets/database_url 2>/dev/null || true)"; \
    export PAYLOAD_SECRET="${PAYLOAD_SECRET:-build-time-only-not-a-secret}"; \
    export NEXT_PUBLIC_SERVER_URL="${NEXT_PUBLIC_SERVER_URL:-http://localhost:3000}"; \
    bunx turbo run build --filter=cms...

# ──────────────────────────────── stage: cms (runtime) ──────────────────────────────────────
# What the client runs inside the network. ~ node + the standalone server + static assets.
FROM ${BASE_IMAGE} AS cms
RUN set -eux; \
    apt-get update; \
    # ca-certificates: TLS to Postgres / Keycloak. tini: proper PID 1 signal handling.
    apt-get install -y --no-install-recommends ca-certificates tini; \
    rm -rf /var/lib/apt/lists/*; \
    groupadd --system --gid 10001 app; \
    useradd --system --uid 10001 --gid app --home-dir /app --shell /usr/sbin/nologin app
COPY --from=node /opt/node/bin/node /usr/local/bin/node
WORKDIR /app
# The standalone folder mirrors the monorepo layout (outputFileTracingRoot = repo root), so the
# server lives at /app/apps/cms/server.js. Static assets and public files are not traced
# automatically and are copied next to it.
COPY --from=build --chown=app:app /repo/apps/cms/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/cms/.next/static ./apps/cms/.next/static
COPY --from=build --chown=app:app /repo/apps/cms/public ./apps/cms/public
COPY --chown=app:app apps/cms/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh \
    # Media uploads land here when Blob storage is not configured; mount a volume on it.
    && mkdir -p /app/apps/cms/public/media /app/apps/cms/.next/cache \
    && chown -R app:app /app/apps/cms/public/media /app/apps/cms/.next/cache
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
USER app
EXPOSE 3000
# Liveness: the server answers on /. Readiness is handled by compose (depends_on: service_healthy).
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"]
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["node", "apps/cms/server.js"]

# ──────────────────────────────── stage: site (runtime) ─────────────────────────────────────
# The public website: Nginx serving static files. The files come from the publish pipeline
# (in the demo: `docker compose --profile snapshot run --rm snapshot` writes apps/cms/.local/site;
# in production: the GitLab job that builds the static site). Nothing dynamic runs here.
FROM ${BASE_IMAGE} AS site
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends nginx-light; \
    rm -rf /var/lib/apt/lists/*; \
    # Run as the unprivileged www-data user: pid + temp paths in /tmp, port 8080.
    rm -f /etc/nginx/sites-enabled/default; \
    mkdir -p /var/www/site /tmp/nginx; \
    chown -R www-data:www-data /var/www/site /tmp/nginx /var/log/nginx
COPY apps/cms/docker/nginx-site.conf /etc/nginx/nginx.conf
COPY --chown=www-data:www-data apps/cms/.local/site/ /var/www/site/
USER www-data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD ["sh", "-c", "wget -qO- http://127.0.0.1:8080/ >/dev/null || curl -fsS http://127.0.0.1:8080/ >/dev/null"]
CMD ["nginx", "-g", "daemon off;"]
