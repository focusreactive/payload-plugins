# create-ideal-cms

Scaffold a production-ready Payload CMS monorepo preconfigured with the
`@focus-reactive` plugin suite.

## Usage

```bash
npx @focus-reactive/create-ideal-cms my-app
# or
npm create @focus-reactive/ideal-cms my-app
```

You'll be prompted for:

- Project name (also used as the target directory)
- Primary brand color (hex)
- Postgres connection string (`DATABASE_URL`)
- Public server URL (`NEXT_PUBLIC_SERVER_URL`)
- Optional: OpenAI key, Vercel Blob token, OIDC SSO credentials
- Package manager (`bun` / `pnpm` / `npm` / skip)

`PAYLOAD_SECRET` is auto-generated.

## What you get

The output mirrors the
[`focusreactive/payload-plugins`](https://github.com/focusreactive/payload-plugins)
monorepo, minus the plugin source packages and the plugin dev sandbox:

```
my-app/
├── apps/
│   └── cms/                  # Payload + Next.js app
├── packages/
│   ├── tailwind-config/
│   ├── typescript-config/
│   └── ui/
├── turbo.json
├── package.json              # bun workspaces
└── …
```

The published `@focus-reactive/payload-plugin-*` packages are added to
`apps/cms` as regular dependencies at their latest known versions.

## Flags

```
npx @focus-reactive/create-ideal-cms [name] [--ref <git-ref>] [--from-local <path>]
```

- `--ref` — GitHub branch/tag/sha of the source monorepo to template from.
  Defaults to `main`. Useful for pinning the scaffold to a known-good revision.
- `--from-local` — use a local checkout of `focusreactive/payload-plugins`
  instead of fetching from GitHub. Path is resolved against the current
  working directory. See [Local development](#local-development).

## Customization

The CLI applies a brand color by appending a `--color-primary` overlay to
`packages/tailwind-config/base.css`. To go further:

- Tweak the full token palette in `packages/tailwind-config/base.css`.
- Update collections, globals, and blocks under `apps/cms/src/`.
- Add or remove plugins in `apps/cms/src/plugins/index.ts`.

## Local development

The CLI lives at `packages/create-ideal-cms/` inside the source monorepo. To
test changes without publishing, scaffold from a local checkout:

```bash
# From inside the monorepo:
cd packages/create-ideal-cms
bun run test:local            # builds, cds to a fresh temp dir, runs --from-local ../..

# Or scaffold into a directory you choose:
cd /tmp
node /path/to/payload-plugins/packages/create-ideal-cms/dist/index.js my-app \
  --from-local /path/to/payload-plugins
```

`--from-local` copies the local repo (skipping `node_modules`, `.next`,
`.turbo`, `dist`, `.git`) instead of fetching the GitHub tarball, so
unpublished changes to `apps/cms` or the workspace packages flow straight
into the scaffold output.

### Global link (optional)

```bash
cd packages/create-ideal-cms
bun run build
bun link
# now from anywhere:
create-ideal-cms my-app --from-local /path/to/payload-plugins
```
