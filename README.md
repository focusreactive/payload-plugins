# Monorepo with Payload CMS plugins

## Skill to add new plugin to _this_ repository

[payload-plugins-add-package](https://github.com/focusreactive/payload-plugins/blob/main/.claude/skills/payload-plugins-add-package/SKILL.md)

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@focus-reactive/payload-plugin-ab`](./packages/payload-plugin-ab) | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-ab)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-ab) | A/B testing plugin — page variants, middleware, analytics adapters |
| [`@focus-reactive/payload-plugin-presets`](./packages/payload-plugin-presets) | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-presets)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-presets) | Presets plugin — save and apply reusable block configurations |
| [`@focus-reactive/payload-plugin-comments`](./packages/payload-plugin-comments) | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-comments)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-comments) | Comments plugin — inline field comments, mentions, annotations, and collaboration |
| [`@focus-reactive/payload-plugin-scheduling`](./packages/payload-plugin-scheduling) | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-scheduling)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-scheduling) | Schedule publication plugin — schedule documents to publish at a future date |

## Development

```bash
bun install
bun run dev        # start local Payload dev app (apps/dev)
bun run build      # build all packages
bun run lint
```

## Publishing

Releases are automated via [multi-semantic-release](https://github.com/dhoulb/multi-semantic-release). Merging to `main` triggers CI which publishes any packages with new commits using [Conventional Commits](https://www.conventionalcommits.org/).

See [CLAUDE.md](./CLAUDE.md) for full details on the publishing flow and conventions.
