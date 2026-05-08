# Payload CMS Plugins by FocusReactive

Open-source Payload CMS plugins for A/B testing, content presets, inline comments, and scheduled publishing on serverless. Use them individually in any Payload project, or together as part of the Ideal CMS toolkit.

## A/B Testing Plugin for Payload CMS

Native experiments with a dynamic percentage of traffic going to each content variant. Control everything from the same page you're working on — page variants, middleware, and analytics adapters included.

- Package: [`@focus-reactive/payload-plugin-ab`](./packages/payload-plugin-ab)
- npm: [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-ab)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-ab)

## Presets Plugin for Payload CMS

Multiple pre-configured block configurations you can use to build up your pages. It's like having multiple versions of default values — because content teams prefer editing over creating from scratch.

- Package: [`@focus-reactive/payload-plugin-presets`](./packages/payload-plugin-presets)
- npm: [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-presets)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-presets)

## Comments Plugin for Payload CMS

A way to collaborate inside the CMS. Inline field comments, mentions, annotations — helpful for both the content team and developers, letting everyone leave feedback directly inside the admin.

- Package: [`@focus-reactive/payload-plugin-comments`](./packages/payload-plugin-comments)
- npm: [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-comments)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-comments)

## Scheduled Publishing Plugin for Payload CMS

Payload CMS natively supports scheduled publishing, but not for serverless platforms like Vercel. Since that's where we deploy most of our projects, we built a plugin that makes it work.

- Package: [`@focus-reactive/payload-plugin-scheduling`](./packages/payload-plugin-scheduling)
- npm: [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-scheduling)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-scheduling)

## Packages Overview

| Package | Version | Description |
|---------|---------|-------------|
| [`@focus-reactive/payload-plugin-ab`](./packages/payload-plugin-ab) | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-ab)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-ab) | A/B testing plugin — page variants, middleware, analytics adapters |
| [`@focus-reactive/payload-plugin-presets`](./packages/payload-plugin-presets) | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-presets)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-presets) | Presets plugin — save and apply reusable block configurations |
| [`@focus-reactive/payload-plugin-comments`](./packages/payload-plugin-comments) | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-comments)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-comments) | Comments plugin — inline field comments, mentions, annotations, and collaboration |
| [`@focus-reactive/payload-plugin-scheduling`](./packages/payload-plugin-scheduling) | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-scheduling)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-scheduling) | Schedule publication plugin — schedule documents to publish at a future date |

## About the Ideal CMS Project

At FocusReactive we build projects on different CMSs — Sanity, Storyblok, Strapi, and Payload. Each platform has its own unique features and limitations, and sometimes a project needs a feature one CMS has but another doesn't.

So we decided to build all of that into one open-source project — we call it **Ideal CMS**. Best features from every CMS we've worked with, available as Payload plugins. You can use the project with everything integrated, or install individual plugins to get the features you need. This often helps our clients free up budget for things we believe should be included from day one.

Every plugin in this repository works independently in any Payload project. For new projects, we recommend starting from the repository that combines all of these plugins together with the basic setup you'll need.

## Development

```bash
bun install
bun run dev        # start local Payload dev app (apps/dev)
bun run build      # build all packages
bun run lint
```

### Adding a New Plugin to This Repository

See the [`payload-plugins-add-package`](https://github.com/focusreactive/payload-plugins/blob/main/.claude/skills/payload-plugins-add-package/SKILL.md) skill for the full workflow.

## Publishing

Releases are automated via [multi-semantic-release](https://github.com/dhoulb/multi-semantic-release). Merging to `main` triggers CI, which publishes any packages with new commits using [Conventional Commits](https://www.conventionalcommits.org/).

See [CLAUDE.md](./CLAUDE.md) for full details on the publishing flow and conventions.

## Contributing

Let's grow the Payload CMS ecosystem together. Issues, discussions, and PRs are all welcome.
