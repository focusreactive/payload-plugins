# Payload CMS Plugins

Open-source Payload CMS plugins for A/B testing, GA4 analytics, content presets, inline comments, AI translation, and scheduled publishing on serverless. Drop any of them into an existing Payload project, or get all of them pre-wired into a production setup — Payload 3, Next.js 16, Postgres, page builder, SSO, semantic search — in the **Ideal CMS** starter that lives in this repo at [`apps/cms`](./apps/cms).

## Quick Start

Scaffold the **Ideal CMS** starter into a standalone repo:

```bash
npx @focus-reactive/create-ideal-cms new-cms-project
```

Interactive prompts collect a project name, brand color, Postgres URL, and optional OpenAI / Vercel Blob tokens. The scaffolder copies [`apps/cms`](./apps/cms), installs dependencies, and initializes git.

To add an individual plugin to an existing Payload project, see the install command under each plugin below. To try the plugins locally first, see [Run Demo Locally](#run-demo-locally).

## About the Ideal CMS Project

At FocusReactive we build projects on different CMSs — Sanity, Storyblok, Strapi, and Payload. Each platform has its own unique features and limitations, and sometimes a project needs a feature one CMS has but another doesn't.

So we decided to build all of that into one open-source project — we call it **Ideal CMS**. Best features from every CMS we've worked with, available as Payload plugins, plus the boilerplate setup we'd write anyway on every project: a block-based page builder, locale-scoped semantic search, SSO, deployment configuration. Pick individual plugins for an existing Payload project, or start from the full starter — same plugins either way. This often helps our clients free up budget for things we believe should be included from day one.

## A/B Testing Plugin for Payload CMS

[a/b variations demo](https://github.com/user-attachments/assets/a775fede-a9f6-4f2b-be97-edcdd5964d4d)

Native experiments with a dynamic percentage of traffic going to each content variant. Control everything from the same page you're working on — page variants, middleware, and analytics adapters included.

```bash
npm install @focus-reactive/payload-plugin-ab
yarn add @focus-reactive/payload-plugin-ab
pnpm add @focus-reactive/payload-plugin-ab
bun add @focus-reactive/payload-plugin-ab
```

- Package: [`@focus-reactive/payload-plugin-ab`](./packages/payload-plugin-ab)
- [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-ab)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-ab)

## Analytics Plugin for Payload CMS

[analytics demo](https://github.com/user-attachments/assets/2edc33a1-9f75-4589-a6bb-b34efc765de2)

A full GA4-backed analytics dashboard right inside the Payload admin — KPIs, traffic, top pages/sources/events, devices, geography, sessions, journeys, and lead-action conversions. GA4 stays the source of truth (nothing touches your database), and a tiny client tracking layer fires page views and conversion events for you. Includes an optional A/B analytics tab that pairs with the A/B testing plugin.

```bash
npm install @focus-reactive/payload-plugin-analytics
yarn add @focus-reactive/payload-plugin-analytics
pnpm add @focus-reactive/payload-plugin-analytics
bun add @focus-reactive/payload-plugin-analytics
```

- Package: [`@focus-reactive/payload-plugin-analytics`](./packages/payload-plugin-analytics)
- [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-analytics)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-analytics)

## Presets Plugin for Payload CMS

Multiple pre-configured block configurations you can use to build up your pages. It's like having multiple versions of default values — because content teams prefer editing over creating from scratch.

```bash
npm install @focus-reactive/payload-plugin-presets
yarn add @focus-reactive/payload-plugin-presets
pnpm add @focus-reactive/payload-plugin-presets
bun add @focus-reactive/payload-plugin-presets
```

- Package: [`@focus-reactive/payload-plugin-presets`](./packages/payload-plugin-presets)
- [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-presets)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-presets)

## Comments Plugin for Payload CMS

[comments demo](https://github.com/user-attachments/assets/6d1f6044-260c-4388-8d90-1c1e2c5484c1)

A way to collaborate inside the CMS. Inline field comments, mentions, annotations — helpful for both the content team and developers, letting everyone leave feedback directly inside the admin.

```bash
npm install @focus-reactive/payload-plugin-comments
yarn add @focus-reactive/payload-plugin-comments
pnpm add @focus-reactive/payload-plugin-comments
bun add @focus-reactive/payload-plugin-comments
```

- Package: [`@focus-reactive/payload-plugin-comments`](./packages/payload-plugin-comments)
- [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-comments)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-comments)

## AI Translation Plugin for Payload CMS

Payload already has a localization plugin, so we built a plugin to do AI translations on top of it — fill in every localized field with one click. Pluggable providers (OpenAI included), bulk translation from list view, and full Lexical rich-text support.

```bash
npm install @focus-reactive/payload-plugin-translator
yarn add @focus-reactive/payload-plugin-translator
pnpm add @focus-reactive/payload-plugin-translator
bun add @focus-reactive/payload-plugin-translator
```

- Package: [`@focus-reactive/payload-plugin-translator`](./packages/payload-plugin-translator)
- [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-translator)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-translator)

## Scheduled Publishing Plugin for Payload CMS

[publish scheduling demo](https://github.com/user-attachments/assets/ae90f371-3688-4fa8-a7a6-e6d996308a85)

Payload CMS natively supports scheduled publishing, but not for serverless platforms like Vercel. Since that's where we deploy most of our projects, we built a plugin that makes it work.

```bash
npm install @focus-reactive/payload-plugin-scheduling
yarn add @focus-reactive/payload-plugin-scheduling
pnpm add @focus-reactive/payload-plugin-scheduling
bun add @focus-reactive/payload-plugin-scheduling
```

- Package: [`@focus-reactive/payload-plugin-scheduling`](./packages/payload-plugin-scheduling)
- [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-scheduling)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-scheduling)

## Packages Overview

| Package                                                                             | Version                                                                                                                                                   | Description                                                                       |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [`@focus-reactive/payload-plugin-ab`](./packages/payload-plugin-ab)                 | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-ab)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-ab)                 | A/B testing plugin — page variants, middleware, analytics adapters                |
| [`@focus-reactive/payload-plugin-analytics`](./packages/payload-plugin-analytics)   | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-analytics)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-analytics)   | Analytics plugin — GA4 dashboard in the admin, client tracking, optional A/B tab  |
| [`@focus-reactive/payload-plugin-presets`](./packages/payload-plugin-presets)       | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-presets)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-presets)       | Presets plugin — save and apply reusable block configurations                     |
| [`@focus-reactive/payload-plugin-comments`](./packages/payload-plugin-comments)     | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-comments)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-comments)     | Comments plugin — inline field comments, mentions, annotations, and collaboration |
| [`@focus-reactive/payload-plugin-translator`](./packages/payload-plugin-translator) | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-translator)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-translator) | AI translation plugin — one-click translations on top of Payload's localization   |
| [`@focus-reactive/payload-plugin-scheduling`](./packages/payload-plugin-scheduling) | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-scheduling)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-scheduling) | Schedule publication plugin — schedule documents to publish at a future date      |

## Run Demo Locally

This repo ships two ready-to-run Payload apps:

- [`apps/dev`](./apps/dev) — minimal sandbox with every plugin wired up, backed by SQLite. Use this to try the plugins or hack on them.
- [`apps/cms`](./apps/cms) — full **Ideal CMS** starter on Postgres (block-based page builder, SSO, semantic search, AI translations). See [`apps/cms/README.md`](./apps/cms/README.md) for setup, or scaffold a standalone copy with `npx @focus-reactive/create-ideal-cms`.

The steps below cover the `apps/dev` sandbox.

### Prerequisites

- [Bun](https://bun.sh/) installed
- Node.js `^18.20.2` or `>=20.9.0`

### Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/focusreactive/payload-plugins.git
   cd payload-plugins
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Configure environment variables**

   Create `apps/dev/.env` with the required values:

   ```bash
   cat > apps/dev/.env <<EOF
   DATABASE_URL=file:./dev.db
   PAYLOAD_SECRET=replace-me-with-any-random-string
   EOF
   ```

4. **Start the dev server**

   ```bash
   bun run dev
   ```

5. **Open the admin panel**

   Visit [http://localhost:4040/admin](http://localhost:4040/admin) and create your first admin user. Every plugin in this repo will be loaded and ready to try.

## Contributing

Let's grow the Payload CMS ecosystem together. Issues, discussions, and PRs are all welcome.
