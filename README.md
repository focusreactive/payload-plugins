# payload-plugins

Monorepo of Payload CMS plugins by [Focus Reactive](https://focusreactive.com).

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@focus-reactive/payload-plugin-ab`](./packages/payload-plugin-ab) | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-ab)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-ab) | A/B testing plugin — page variants, middleware, analytics adapters |
| [`@focus-reactive/payload-plugin-presets`](./packages/payload-plugin-presets) | [![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-presets)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-presets) | Presets plugin — save and apply reusable block configurations |

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
