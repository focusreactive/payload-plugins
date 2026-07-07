# @fr-private/payload-plugin-visual-editing (local stub)

This is a **temporary no-op stand-in** for the real, private
`@fr-private/payload-plugin-visual-editing` package. It exists only so
`bun install` succeeds on machines without an npm token that belongs to the
`@fr-private` org (the real package is private and 404s otherwise).

It exports the same surface the apps import, as no-ops:

| Entry     | Export                    | Behaviour                          |
| --------- | ------------------------- | ---------------------------------- |
| `.`       | `visualEditingPlugin`     | pass-through Payload plugin        |
| `./client`| `VisualEditing`           | `Provider`/`Overlay` render children, `Toggle` renders nothing |
| `./client`| `withVisualEditingPath`   | returns `{}`                       |
| `./admin` | `VisualEditingBridgeProvider` | renders children               |

The only inert behaviour is the live-edit overlay itself; everything else
builds, type-checks, and runs.

## Restoring the real package

1. Get an npm token for an account that is a member of the `@fr-private` org.
2. In `apps/cms/package.json` and `apps/multi-tenancy-demo/package.json`, change
   the dependency back from `"workspace:*"` to `"^1.0.2"` (or the desired range).
3. Delete this `packages/fr-visual-editing-stub/` directory.
4. `NPM_TOKEN=<token> bun install`.
