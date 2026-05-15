# Payload CMS Plugins

Open-source Payload CMS plugins for A/B testing, content presets, inline comments, and scheduled publishing on serverless. Use them individually in any Payload project, or together as part of the Ideal CMS toolkit.

## About the Ideal CMS Project

At FocusReactive we build projects on different CMSs — Sanity, Storyblok, Strapi, and Payload. Each platform has its own unique features and limitations, and sometimes a project needs a feature one CMS has but another doesn't.

So we decided to build all of that into one open-source project — we call it **Ideal CMS**. Best features from every CMS we've worked with, available as Payload plugins. You can use the project with everything integrated, or install individual plugins to get the features you need. This often helps our clients free up budget for things we believe should be included from day one.

Every plugin in this repository works independently in any Payload project. For new projects, we recommend starting from the repository that combines all of these plugins together with the basic setup you'll need.

## A/B Testing Plugin for Payload CMS

[a/b variations demo](https://github.com/user-attachments/assets/a775fede-a9f6-4f2b-be97-edcdd5964d4d)

Native experiments with a dynamic percentage of traffic going to each content variant. Control everything from the same page you're working on — page variants, middleware, and analytics adapters included.

- Package: [`@focus-reactive/payload-plugin-ab`](./packages/payload-plugin-ab)
- [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-ab)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-ab)

## Presets Plugin for Payload CMS

Multiple pre-configured block configurations you can use to build up your pages. It's like having multiple versions of default values — because content teams prefer editing over creating from scratch.

- Package: [`@focus-reactive/payload-plugin-presets`](./packages/payload-plugin-presets)
- [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-presets)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-presets)

## Comments Plugin for Payload CMS

[comments demo](https://github.com/user-attachments/assets/6d1f6044-260c-4388-8d90-1c1e2c5484c1)

A way to collaborate inside the CMS. Inline field comments, mentions, annotations — helpful for both the content team and developers, letting everyone leave feedback directly inside the admin.

- Package: [`@focus-reactive/payload-plugin-comments`](./packages/payload-plugin-comments)
- [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-comments)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-comments)

## Scheduled Publishing Plugin for Payload CMS

[publish scheduling demo](https://github.com/user-attachments/assets/ae90f371-3688-4fa8-a7a6-e6d996308a85)

Payload CMS natively supports scheduled publishing, but not for serverless platforms like Vercel. Since that's where we deploy most of our projects, we built a plugin that makes it work.

- Package: [`@focus-reactive/payload-plugin-scheduling`](./packages/payload-plugin-scheduling)
- [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-scheduling)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-scheduling)

## Packages Overview

| Package                                                                             | Version                                                                                                                                                   | Description                                                                       |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [`@focus-reactive/payload-plugin-ab`](./packages/payload-plugin-ab)                 | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-ab)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-ab)                 | A/B testing plugin — page variants, middleware, analytics adapters                |
| [`@focus-reactive/payload-plugin-presets`](./packages/payload-plugin-presets)       | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-presets)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-presets)       | Presets plugin — save and apply reusable block configurations                     |
| [`@focus-reactive/payload-plugin-comments`](./packages/payload-plugin-comments)     | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-comments)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-comments)     | Comments plugin — inline field comments, mentions, annotations, and collaboration |
| [`@focus-reactive/payload-plugin-scheduling`](./packages/payload-plugin-scheduling) | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-scheduling)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-scheduling) | Schedule publication plugin — schedule documents to publish at a future date      |

## Run Demo Locally

The `apps/dev` folder is a minimal dev project with plugins pre-installed, to run and test locally. Backed by SQLite — no external database required.

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
